import * as vscode from "vscode";
import * as path from "node:path";
import { FileSizeDecorationProvider } from "./FileDecorationProvider";

interface FileItem {
  path: string;
  relativePath: string;
  name: string;
  size: number;
  formattedSize: string;
  extension: string;
  isDirectory: boolean;
}

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly decorationProvider: FileSizeDecorationProvider;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    decorationProvider: FileSizeDecorationProvider,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.decorationProvider = decorationProvider;

    // Set the webview's initial html content
    this.update();

    // Listen for when the panel is disposed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        void this.handleMessage(message);
      },
      null,
      this.disposables,
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    decorationProvider: FileSizeDecorationProvider,
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(column);
      DashboardPanel.currentPanel.refresh();
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "fileSizeViewerDashboard",
      "File Size Dashboard",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      },
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      decorationProvider,
    );
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;

    // Clean up our resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async update(): Promise<void> {
    const webview = this.panel.webview;
    this.panel.webview.html = await this.getHtmlForWebview(webview);
  }

  private async refresh(): Promise<void> {
    await this.update();
  }

  private async handleMessage(message: {
    command: string;
    filePath?: string;
    preset?: any;
    presetName?: string;
  }): Promise<void> {
    switch (message.command) {
      case "refresh":
        await this.scanWorkspace();
        break;
      case "openFile":
        if (message.filePath) {
          const uri = vscode.Uri.file(message.filePath);
          await vscode.window.showTextDocument(uri);
        }
        break;
      case "revealInExplorer":
        if (message.filePath) {
          const uri = vscode.Uri.file(message.filePath);
          await vscode.commands.executeCommand("revealInExplorer", uri);
        }
        break;
      case "copyPath":
        if (message.filePath) {
          await vscode.env.clipboard.writeText(message.filePath);
          void vscode.window.showInformationMessage("Path copied to clipboard");
        }
        break;
      case "getFiles":
        await this.scanWorkspace();
        break;
      case "savePreset":
        if (message.preset && message.presetName) {
          await this.saveFilterPreset(message.presetName, message.preset);
        }
        break;
      case "loadPresets":
        await this.loadFilterPresets();
        break;
      case "deletePreset":
        if (message.presetName) {
          await this.deleteFilterPreset(message.presetName);
        }
        break;
    }
  }

  private async saveFilterPreset(name: string, preset: any): Promise<void> {
    const config = vscode.workspace.getConfiguration("fileSizeViewer");
    const presets = config.get<Record<string, any>>("filterPresets", {});

    presets[name] = preset;

    await config.update(
      "filterPresets",
      presets,
      vscode.ConfigurationTarget.Global,
    );
    void vscode.window.showInformationMessage(`Filter preset "${name}" saved`);

    await this.loadFilterPresets();
  }

  private async loadFilterPresets(): Promise<void> {
    const config = vscode.workspace.getConfiguration("fileSizeViewer");
    const presets = config.get<Record<string, any>>("filterPresets", {});

    void this.panel.webview.postMessage({
      command: "presetsLoaded",
      presets,
    });
  }

  private async deleteFilterPreset(name: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("fileSizeViewer");
    const presets = config.get<Record<string, any>>("filterPresets", {});

    delete presets[name];

    await config.update(
      "filterPresets",
      presets,
      vscode.ConfigurationTarget.Global,
    );
    void vscode.window.showInformationMessage(
      `Filter preset "${name}" deleted`,
    );

    await this.loadFilterPresets();
  }

  private async scanWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      void this.panel.webview.postMessage({
        command: "filesScanned",
        files: [],
      });
      return;
    }

    const files: FileItem[] = [];

    for (const folder of workspaceFolders) {
      const items = await this.scanFolder(folder.uri.fsPath);
      files.push(...items);
    }

    // Sort by size descending by default
    files.sort((a, b) => b.size - a.size);

    void this.panel.webview.postMessage({
      command: "filesScanned",
      files,
    });
  }

  private async scanFolder(folderPath: string): Promise<FileItem[]> {
    const items: FileItem[] = [];

    try {
      // Use VS Code's file system API to find files
      const pattern = new vscode.RelativePattern(folderPath, "**/*");
      const files = await vscode.workspace.findFiles(
        pattern,
        "**/node_modules/**",
        5000,
      );

      for (const fileUri of files) {
        const size = await this.decorationProvider.getSize(fileUri.fsPath);
        if (size !== null) {
          const fileName = path.basename(fileUri.fsPath);
          const extension = path.extname(fileUri.fsPath);
          // Get workspace-relative path for better folder grouping
          const relativePath = path.relative(folderPath, fileUri.fsPath);

          items.push({
            path: fileUri.fsPath,
            relativePath: relativePath,
            name: fileName,
            size,
            formattedSize: this.decorationProvider.formatSizePublic(size),
            extension: extension || "(none)",
            isDirectory: false,
          });
        }
      }
    } catch (error) {
      console.error("Error scanning folder:", error);
    }

    return items;
  }

  private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Size Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
    }

    h1 {
      margin-bottom: 20px;
      font-size: 24px;
      font-weight: 600;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 20px;
    }

    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 2px;
      font-size: 13px;
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .search-box {
      padding: 6px 10px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-size: 13px;
      width: 250px;
    }

    select {
      padding: 6px 10px;
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      font-size: 13px;
    }

    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 15px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }

    .stat {
      flex: 1;
    }

    .stat-label {
      font-size: 11px;
      opacity: 0.7;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      position: sticky;
      top: 0;
    }

    th {
      text-align: left;
      padding: 12px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
    }

    th:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    th.sorted-asc::after {
      content: " ▲";
      opacity: 0.6;
    }

    th.sorted-desc::after {
      content: " ▼";
      opacity: 0.6;
    }

    td {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      font-size: 13px;
    }

    tr:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .file-name {
      font-weight: 500;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
    }

    .file-name:hover {
      text-decoration: underline;
    }

    .file-path {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
    }

    .file-size {
      font-weight: 500;
      font-family: var(--vscode-editor-font-family);
    }

    .size-large {
      color: var(--vscode-errorForeground);
    }

    .size-medium {
      color: var(--vscode-editorWarning-foreground);
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 4px 8px;
      font-size: 11px;
      opacity: 0.8;
    }

    .action-btn:hover {
      opacity: 1;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }

    .empty {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }

    .advanced-filters {
      margin-bottom: 15px;
      padding: 15px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
    }

    .filter-row {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 150px;
    }

    .filter-group label {
      font-size: 11px;
      opacity: 0.8;
      font-weight: 500;
    }

    .filter-input {
      padding: 6px 10px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-size: 13px;
    }

    .preset-controls {
      display: flex;
      gap: 15px;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    .preset-save-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 1;
      min-width: 300px;
    }

    .preset-load-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 1;
      min-width: 250px;
    }

    .preset-select {
      flex: 1;
      min-width: 150px;
      padding: 6px 10px;
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      font-size: 13px;
    }

    .secondary-btn {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      padding: 6px 12px;
      font-size: 12px;
    }

    .secondary-btn:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .filter-toggle {
      margin-bottom: 15px;
    }

    .filter-toggle button {
      font-size: 12px;
      padding: 6px 12px;
    }

    .charts-section {
      margin: 20px 0;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .charts-toggle {
      margin-bottom: 15px;
    }

    .charts-toggle button {
      font-size: 12px;
      padding: 6px 12px;
    }

    .charts-container {
      display: none;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 15px;
    }

    .chart-card {
      flex: 1;
      min-width: 400px;
      padding: 15px;
      background-color: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--vscode-foreground);
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
      margin-top: 10px;
    }

    .treemap-container {
      position: relative;
      height: 300px;
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background-color: var(--vscode-editor-background);
    }

    .treemap-item {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      color: white;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      overflow: hidden;
      transition: opacity 0.2s;
      border-radius: 2px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    .treemap-item:hover {
      opacity: 0.8;
      outline: 2px solid var(--vscode-focusBorder);
    }

    .treemap-label {
      word-break: break-word;
      line-height: 1.2;
      font-weight: 600;
    }

    .treemap-size {
      font-size: 9px;
      opacity: 0.95;
      margin-top: 2px;
      font-weight: 500;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <h1>📊 File Size Dashboard</h1>

  <div class="header">
    <div class="controls">
      <button id="refreshBtn">🔄 Refresh</button>
      <input type="text" id="searchBox" class="search-box" placeholder="Search files...">
      <select id="extensionFilter">
        <option value="">All Extensions</option>
      </select>
      <select id="limitSelect">
        <option value="50">Top 50</option>
        <option value="100" selected>Top 100</option>
        <option value="250">Top 250</option>
        <option value="500">Top 500</option>
        <option value="all">All Files</option>
      </select>
    </div>
  </div>

  <div class="advanced-filters" id="advancedFilters" style="display: none;">
    <div class="filter-row">
      <div class="filter-group">
        <label>Min Size:</label>
        <input type="text" id="minSize" placeholder="e.g., 1MB" class="filter-input">
      </div>
      <div class="filter-group">
        <label>Max Size:</label>
        <input type="text" id="maxSize" placeholder="e.g., 100MB" class="filter-input">
      </div>
      <div class="filter-group">
        <label>Folder Path Contains:</label>
        <input type="text" id="folderFilter" placeholder="e.g., src" class="filter-input">
      </div>
    </div>
    <div class="preset-controls">
      <div class="preset-save-group">
        <input type="text" id="presetNameInput" placeholder="Preset name (e.g., Large Source Files)" class="filter-input" style="min-width: 250px;">
        <button id="savePresetBtn" class="secondary-btn">💾 Save Preset</button>
      </div>
      <div class="preset-load-group">
        <select id="presetSelect" class="preset-select">
          <option value="">Load Preset...</option>
        </select>
        <button id="deletePresetBtn" class="secondary-btn">🗑️ Delete</button>
      </div>
    </div>
  </div>

  <div class="filter-toggle">
    <button id="toggleFiltersBtn" class="secondary-btn">🔽 Show Advanced Filters</button>
  </div>

  <div class="stats" id="stats" style="display: none;">
    <div class="stat">
      <div class="stat-label">Total Files</div>
      <div class="stat-value" id="totalFiles">0</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Size</div>
      <div class="stat-value" id="totalSize">0 B</div>
    </div>
    <div class="stat">
      <div class="stat-label">Largest File</div>
      <div class="stat-value" id="largestFile">-</div>
    </div>
    <div class="stat">
      <div class="stat-label">Showing</div>
      <div class="stat-value" id="showingCount">0</div>
    </div>
  </div>

  <div class="charts-section">
    <div class="charts-toggle">
      <button id="toggleChartsBtn" class="secondary-btn">📊 Show Charts</button>
    </div>
    <div class="charts-container" id="chartsContainer">
      <div class="chart-card">
        <div class="chart-title">Top Files by Size</div>
        <div class="chart-wrapper">
          <canvas id="topFilesChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Folder Size Distribution</div>
        <div class="treemap-container" id="treemapContainer">
          <!-- Treemap will be dynamically generated -->
        </div>
      </div>
    </div>
  </div>

  <div class="table-container">
    <div id="loading" class="loading">Loading files...</div>
    <div id="empty" class="empty" style="display: none;">No files found</div>
    <table id="filesTable" style="display: none;">
      <thead>
        <tr>
          <th data-sort="name">File Name</th>
          <th data-sort="size">Size</th>
          <th data-sort="extension">Extension</th>
          <th data-sort="path">Path</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="filesBody">
      </tbody>
    </table>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let allFiles = [];
    let filteredFiles = [];
    let currentSort = { column: 'size', direction: 'desc' };

    // Request files on load
    vscode.postMessage({ command: 'getFiles' });

    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', () => {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('filesTable').style.display = 'none';
      document.getElementById('empty').style.display = 'none';
      vscode.postMessage({ command: 'refresh' });
    });

    document.getElementById('searchBox').addEventListener('input', (e) => {
      filterAndRender();
    });

    document.getElementById('extensionFilter').addEventListener('change', () => {
      filterAndRender();
    });

    document.getElementById('limitSelect').addEventListener('change', () => {
      filterAndRender();
    });

    // Advanced filter event listeners
    document.getElementById('minSize').addEventListener('input', () => {
      filterAndRender();
    });

    document.getElementById('maxSize').addEventListener('input', () => {
      filterAndRender();
    });

    document.getElementById('folderFilter').addEventListener('input', () => {
      filterAndRender();
    });

    document.getElementById('toggleFiltersBtn').addEventListener('click', () => {
      const advFilters = document.getElementById('advancedFilters');
      const toggleBtn = document.getElementById('toggleFiltersBtn');
      if (advFilters.style.display === 'none') {
        advFilters.style.display = 'block';
        toggleBtn.textContent = '🔼 Hide Advanced Filters';
      } else {
        advFilters.style.display = 'none';
        toggleBtn.textContent = '🔽 Show Advanced Filters';
      }
    });

    document.getElementById('toggleChartsBtn').addEventListener('click', () => {
      const chartsContainer = document.getElementById('chartsContainer');
      const toggleBtn = document.getElementById('toggleChartsBtn');
      if (chartsContainer.style.display === 'none') {
        chartsContainer.style.display = 'flex';
        toggleBtn.textContent = '📊 Hide Charts';
        // Render charts when shown
        const limit = document.getElementById('limitSelect').value;
        const displayFiles = limit === 'all' ? filteredFiles : filteredFiles.slice(0, parseInt(limit));
        renderCharts(displayFiles);
      } else {
        chartsContainer.style.display = 'none';
        toggleBtn.textContent = '📊 Show Charts';
      }
    });

    document.getElementById('savePresetBtn').addEventListener('click', async () => {
      const nameInput = document.getElementById('presetNameInput');
      const name = nameInput.value.trim();

      if (!name) {
        alert('Please enter a preset name');
        return;
      }

      const preset = {
        search: document.getElementById('searchBox').value,
        extension: document.getElementById('extensionFilter').value,
        minSize: document.getElementById('minSize').value,
        maxSize: document.getElementById('maxSize').value,
        folderPath: document.getElementById('folderFilter').value,
        limit: document.getElementById('limitSelect').value,
      };

      vscode.postMessage({
        command: 'savePreset',
        presetName: name,
        preset
      });

      // Clear the input after saving
      nameInput.value = '';
    });

    document.getElementById('presetSelect').addEventListener('change', (e) => {
      const selectedPreset = e.target.value;
      if (!selectedPreset || !window.currentPresets || !window.currentPresets[selectedPreset]) return;

      const preset = window.currentPresets[selectedPreset];
      document.getElementById('searchBox').value = preset.search || '';
      document.getElementById('extensionFilter').value = preset.extension || '';
      document.getElementById('minSize').value = preset.minSize || '';
      document.getElementById('maxSize').value = preset.maxSize || '';
      document.getElementById('folderFilter').value = preset.folderPath || '';
      document.getElementById('limitSelect').value = preset.limit || '100';

      filterAndRender();
    });

    document.getElementById('deletePresetBtn').addEventListener('click', () => {
      const selectedPreset = document.getElementById('presetSelect').value;
      if (!selectedPreset) {
        alert('Please select a preset to delete');
        return;
      }

      if (confirm(\`Delete preset "\${selectedPreset}"?\`)) {
        vscode.postMessage({
          command: 'deletePreset',
          presetName: selectedPreset
        });
      }
    });

    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const column = th.dataset.sort;
        if (currentSort.column === column) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = column;
          currentSort.direction = 'desc';
        }
        renderFiles();
      });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'filesScanned') {
        allFiles = message.files;
        populateExtensionFilter();
        filterAndRender();
      } else if (message.command === 'presetsLoaded') {
        window.currentPresets = message.presets;
        populatePresetSelect(message.presets);
      }
    });

    // Request presets on load
    vscode.postMessage({ command: 'loadPresets' });

    function populatePresetSelect(presets) {
      const select = document.getElementById('presetSelect');
      select.innerHTML = '<option value="">Load Preset...</option>';

      Object.keys(presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
    }

    function populateExtensionFilter() {
      const extensions = new Set(allFiles.map(f => f.extension));
      const select = document.getElementById('extensionFilter');
      select.innerHTML = '<option value="">All Extensions</option>';

      Array.from(extensions).sort().forEach(ext => {
        const option = document.createElement('option');
        option.value = ext;
        option.textContent = ext;
        select.appendChild(option);
      });
    }

    function filterAndRender() {
      const searchTerm = document.getElementById('searchBox').value.toLowerCase();
      const extensionFilter = document.getElementById('extensionFilter').value;
      const minSizeStr = document.getElementById('minSize').value;
      const maxSizeStr = document.getElementById('maxSize').value;
      const folderFilter = document.getElementById('folderFilter').value.toLowerCase();

      // Parse size strings (supports KB, MB, GB)
      const minSizeBytes = parseSizeString(minSizeStr);
      const maxSizeBytes = parseSizeString(maxSizeStr);

      filteredFiles = allFiles.filter(file => {
        const matchesSearch = !searchTerm ||
          file.name.toLowerCase().includes(searchTerm) ||
          file.path.toLowerCase().includes(searchTerm);

        const matchesExtension = !extensionFilter || file.extension === extensionFilter;

        const matchesMinSize = minSizeBytes === null || file.size >= minSizeBytes;
        const matchesMaxSize = maxSizeBytes === null || file.size <= maxSizeBytes;

        const matchesFolder = !folderFilter || file.path.toLowerCase().includes(folderFilter);

        return matchesSearch && matchesExtension && matchesMinSize && matchesMaxSize && matchesFolder;
      });

      renderFiles();
    }

    function parseSizeString(sizeStr) {
      if (!sizeStr || sizeStr.trim() === '') return null;

      const str = sizeStr.trim().toUpperCase();
      const match = str.match(/^([0-9.]+)\\s*(B|KB|MB|GB)?$/);

      if (!match) return null;

      const value = parseFloat(match[1]);
      const unit = match[2] || 'B';

      const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
      };

      return value * multipliers[unit];
    }

    function renderFiles() {
      const loading = document.getElementById('loading');
      const empty = document.getElementById('empty');
      const table = document.getElementById('filesTable');
      const stats = document.getElementById('stats');

      if (filteredFiles.length === 0) {
        loading.style.display = 'none';
        empty.style.display = 'block';
        table.style.display = 'none';
        stats.style.display = 'none';
        return;
      }

      loading.style.display = 'none';
      empty.style.display = 'none';
      table.style.display = 'table';
      stats.style.display = 'flex';

      // Sort files
      const sorted = [...filteredFiles].sort((a, b) => {
        const aVal = a[currentSort.column];
        const bVal = b[currentSort.column];

        let comparison = 0;
        if (typeof aVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return currentSort.direction === 'asc' ? comparison : -comparison;
      });

      // Apply limit
      const limit = document.getElementById('limitSelect').value;
      const displayFiles = limit === 'all' ? sorted : sorted.slice(0, parseInt(limit));

      // Update table headers
      document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
          th.classList.add(\`sorted-\${currentSort.direction}\`);
        }
      });

      // Render rows
      const tbody = document.getElementById('filesBody');
      tbody.innerHTML = '';

      displayFiles.forEach(file => {
        const row = document.createElement('tr');

        const sizeClass = file.size > 100 * 1024 * 1024 ? 'size-large' :
                         file.size > 1 * 1024 * 1024 ? 'size-medium' : '';

        row.innerHTML = \`
          <td>
            <div class="file-name" data-path="\${file.path}">\${file.name}</div>
          </td>
          <td class="file-size \${sizeClass}">\${file.formattedSize}</td>
          <td>\${file.extension}</td>
          <td class="file-path">\${file.path}</td>
          <td class="actions">
            <button class="action-btn" data-action="open" data-path="\${file.path}">Open</button>
            <button class="action-btn" data-action="reveal" data-path="\${file.path}">Reveal</button>
            <button class="action-btn" data-action="copy" data-path="\${file.path}">Copy Path</button>
          </td>
        \`;

        tbody.appendChild(row);
      });

      // Add click handlers
      tbody.querySelectorAll('.file-name').forEach(el => {
        el.addEventListener('click', (e) => {
          vscode.postMessage({
            command: 'openFile',
            filePath: e.target.dataset.path
          });
        });
      });

      tbody.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          const filePath = e.target.dataset.path;

          const commands = {
            open: 'openFile',
            reveal: 'revealInExplorer',
            copy: 'copyPath'
          };

          vscode.postMessage({
            command: commands[action],
            filePath
          });
        });
      });

      // Update stats
      const totalSize = filteredFiles.reduce((sum, f) => sum + f.size, 0);
      const largest = filteredFiles.length > 0 ? filteredFiles.reduce((max, f) => f.size > max.size ? f : max) : null;

      document.getElementById('totalFiles').textContent = filteredFiles.length;
      document.getElementById('totalSize').textContent = formatSize(totalSize);
      document.getElementById('largestFile').textContent = largest ? largest.formattedSize : '-';
      document.getElementById('showingCount').textContent = displayFiles.length;

      // Update charts if visible
      if (document.getElementById('chartsContainer').style.display !== 'none') {
        renderCharts(displayFiles);
      }
    }

    let topFilesChartInstance = null;

    function renderCharts(files) {
      renderTopFilesChart(files);
      renderTreemap(files);
    }

    function renderTopFilesChart(files) {
      const ctx = document.getElementById('topFilesChart');

      // Destroy existing chart
      if (topFilesChartInstance) {
        topFilesChartInstance.destroy();
      }

      // Get top 10 files
      const topFiles = files.slice(0, 10);

      // Prepare data
      const labels = topFiles.map(f => f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name);
      const data = topFiles.map(f => f.size / (1024 * 1024)); // Convert to MB
      const paths = topFiles.map(f => f.path);

      // Create chart
      topFilesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Size (MB)',
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              vscode.postMessage({
                command: 'openFile',
                filePath: paths[index]
              });
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const file = topFiles[context.dataIndex];
                  return [
                    \`Size: \${file.formattedSize}\`,
                    \`Path: \${file.path}\`
                  ];
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Size (MB)'
              }
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            }
          }
        }
      });
    }

    function renderTreemap(files) {
      const container = document.getElementById('treemapContainer');
      container.innerHTML = '';

      // Group files by top-level folder
      const folderSizes = {};
      files.forEach(file => {
        // Use relativePath which is already workspace-relative
        const relativePath = file.relativePath || file.path;
        // Split by both / and \ to handle Windows and Unix paths
        const parts = relativePath.split(/[\\/]/).filter(p => p.length > 0);
        const folder = parts.length > 0 ? parts[0] : '(root)';

        if (!folderSizes[folder]) {
          // Store first file's directory path to use for folder revelation
          const folderPath = file.path.substring(0, file.path.lastIndexOf(relativePath) + folder.length);
          folderSizes[folder] = { size: 0, files: [], folderPath: folderPath };
        }
        folderSizes[folder].size += file.size;
        folderSizes[folder].files.push(file);
      });

      // Sort folders by size
      const sortedFolders = Object.entries(folderSizes)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 15); // Show top 15 folders

      // Calculate total for percentage
      const totalSize = sortedFolders.reduce((sum, [_, data]) => sum + data.size, 0);

      // Generate colors
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#EF476F', '#FFD166', '#06FFA5', '#118AB2', '#073B4C'
      ];

      // Create treemap items
      sortedFolders.forEach(([folder, data], index) => {
        const percentage = (data.size / totalSize) * 100;
        const item = document.createElement('div');
        item.className = 'treemap-item';
        item.style.flex = \`\${percentage} 1 0%\`;
        item.style.minWidth = \`\${Math.max(percentage, 10)}%\`;
        item.style.backgroundColor = colors[index % colors.length];
        item.title = \`\${folder}: \${formatSize(data.size)} (\${data.files.length} files)\nClick to reveal in Explorer\`;

        // Show text for folders with at least 2% of total size
        const shouldShowText = percentage > 2;

        item.innerHTML = \`
          <div>
            <div class="treemap-label">\${shouldShowText ? folder : ''}</div>
            <div class="treemap-size">\${shouldShowText ? formatSize(data.size) : ''}</div>
          </div>
        \`;

        // Click handler - reveal folder in explorer
        item.addEventListener('click', () => {
          vscode.postMessage({
            command: 'revealInExplorer',
            filePath: data.folderPath
          });
        });

        container.appendChild(item);
      });
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
  </script>
</body>
</html>`;
  }
}
