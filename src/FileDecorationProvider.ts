import * as vscode from "vscode";
import * as fs from "fs";

export class FileSizeDecorationProvider implements vscode.FileDecorationProvider {
  onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[]>;

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    return this.getFileSize(uri.fsPath)
      .then(size => {
        if (size === null) return;

        const icon = this.getSizeBadge(size);
        return {
                badge: icon,
                tooltip: `Size: ${this.formatSize(size)}`
        } as vscode.FileDecoration;
      })
      .catch(() => undefined);
  }

  private async getFileSize(filePath: string): Promise<number | null> {
    try {
        const stats = await fs.promises.stat(filePath);

        if (stats.isFile()) {
            return stats.size;
        } else if (stats.isDirectory()) {
            return await this.getFolderSize(filePath);  // Calculate folder size
        }

        return null;
    } catch {
        return null;
    }
  }

  private async getFolderSize(folderPath: string): Promise<number> {
    let totalSize = 0;

    try {
        const files = await fs.promises.readdir(folderPath);

        for (const file of files) {
            const filePath = `${folderPath}/${file}`;
            const stats = await fs.promises.stat(filePath);

            if (stats.isFile()) {
                totalSize += stats.size;
            } else if (stats.isDirectory()) {
                totalSize += await this.getFolderSize(filePath); // Recursively add size
            }
        }
    } catch (error) {
        console.error(`Error calculating folder size: ${folderPath}`, error);
    }

    return totalSize;
  }

  private getSizeBadge(size: number): string {
    // Fetch user-defined thresholds (or fallback to defaults)
    const config = vscode.workspace.getConfiguration("fileSizeViewer");
    const smallThreshold = config.get<number>("smallThreshold", 1048576); // Default: 1MB
    const mediumThreshold = config.get<number>("mediumThreshold", 104857600); // Default: 100MB

    // Apply dynamic size categorization
    if (size < smallThreshold) return "🟢"; // Small file
    if (size < mediumThreshold) return "🟡"; // Medium file
    return "🔴"; // Large file
  }

  private formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}
