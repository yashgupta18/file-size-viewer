import * as vscode from "vscode";
import * as path from "node:path";
import { FileSizeDecorationProvider } from "./FileDecorationProvider";

interface FileItem {
  path: string;
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
    }
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

          items.push({
            path: fileUri.fsPath,
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
  </style>
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
      }
    });

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

      filteredFiles = allFiles.filter(file => {
        const matchesSearch = !searchTerm ||
          file.name.toLowerCase().includes(searchTerm) ||
          file.path.toLowerCase().includes(searchTerm);

        const matchesExtension = !extensionFilter || file.extension === extensionFilter;

        return matchesSearch && matchesExtension;
      });

      renderFiles();
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
