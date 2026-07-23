import * as vscode from "vscode";
import { FileSizeDecorationProvider } from "./FileDecorationProvider";

interface WorkspaceStats {
  totalFiles: number;
  totalSize: number;
  largestFile: { path: string; size: number } | null;
}

export class SidebarProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | undefined | null | void
  > = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private stats: WorkspaceStats | null = null;
  private loading = false;

  constructor(private decorationProvider: FileSizeDecorationProvider) {}

  refresh(): void {
    this.stats = null;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    if (element) {
      return [];
    }

    // Show loading state
    if (!this.stats && !this.loading) {
      this.loading = true;
      void this.loadStats().then(() => {
        this.loading = false;
        this._onDidChangeTreeData.fire();
      });
      return [
        new TreeItem(
          "Loading workspace statistics...",
          "",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    if (!this.stats) {
      return [];
    }

    const items: TreeItem[] = [];

    items.push(
      new TreeItem(
        `📁 Total Files: ${this.stats.totalFiles}`,
        "",
        vscode.TreeItemCollapsibleState.None,
      ),
    );

    items.push(
      new TreeItem(
        `💾 Total Size: ${this.formatSize(this.stats.totalSize)}`,
        "",
        vscode.TreeItemCollapsibleState.None,
      ),
    );

    if (this.stats.largestFile) {
      const fileName = this.stats.largestFile.path.split("/").pop() || "";
      items.push(
        new TreeItem(
          `🔴 Largest: ${fileName}`,
          `${this.formatSize(this.stats.largestFile.size)}`,
          vscode.TreeItemCollapsibleState.None,
          {
            command: "vscode.open",
            title: "Open File",
            arguments: [vscode.Uri.file(this.stats.largestFile.path)],
          },
        ),
      );
    }

    items.push(
      new TreeItem(
        "📊 Open Dashboard",
        "Click to analyze all files",
        vscode.TreeItemCollapsibleState.None,
        {
          command: "fileSizeViewer.openDashboard",
          title: "Open Dashboard",
        },
      ),
    );

    return items;
  }

  private async loadStats(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    let totalFiles = 0;
    let totalSize = 0;
    let largestFile: { path: string; size: number } | null = null;

    for (const folder of workspaceFolders) {
      const pattern = new vscode.RelativePattern(folder.uri.fsPath, "**/*");
      const files = await vscode.workspace.findFiles(
        pattern,
        "**/node_modules/**",
        1000,
      );

      for (const fileUri of files) {
        const size = await this.decorationProvider.getSize(fileUri.fsPath);
        if (size !== null) {
          totalFiles++;
          totalSize += size;

          if (!largestFile || size > largestFile.size) {
            largestFile = { path: fileUri.fsPath, size };
          }
        }
      }
    }

    this.stats = {
      totalFiles,
      totalSize,
      largestFile,
    };
  }

  private formatSize(bytes: number): string {
    return this.decorationProvider.formatSizePublic(bytes);
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.tooltip = label;
  }
}
