import * as vscode from "vscode";
import * as fs from "fs";

interface SizeBandThresholds {
  greenMaxBytes: number;
  yellowMinBytes: number;
  yellowMaxBytes: number;
  redMinBytes: number;
}

export class FileSizeDecorationProvider
  implements vscode.FileDecorationProvider, vscode.Disposable
{
  private readonly onDidChangeFileDecorationsEmitter = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[]
  >();
  public readonly onDidChangeFileDecorations =
    this.onDidChangeFileDecorationsEmitter.event;
  private thresholds: SizeBandThresholds;

  constructor() {
    this.thresholds = this.loadThresholds();
  }

  public dispose(): void {
    this.onDidChangeFileDecorationsEmitter.dispose();
  }

  public reloadConfiguration(): void {
    this.thresholds = this.loadThresholds();
    this.onDidChangeFileDecorationsEmitter.fire([]);
  }

  provideFileDecoration(
    uri: vscode.Uri,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    return this.getFileSize(uri.fsPath)
      .then((size) => {
        if (size === null) {
          return;
        }

        const icon = this.getSizeBadge(size);
        return {
          badge: icon,
          tooltip: `Size: ${this.formatSize(size)}`,
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
        return await this.getFolderSize(filePath); // Calculate folder size
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
    if (size <= this.thresholds.greenMaxBytes) {
      return "🟢";
    }

    if (
      size >= this.thresholds.yellowMinBytes &&
      size <= this.thresholds.yellowMaxBytes
    ) {
      return "🟡";
    }

    if (size >= this.thresholds.redMinBytes) {
      return "🔴";
    }

    // Fill potential gaps between configured bands while preserving monotonic color progression.
    if (size < this.thresholds.yellowMinBytes) {
      return "🟢";
    }

    if (size < this.thresholds.redMinBytes) {
      return "🟡";
    }

    return "🔴";
  }

  private formatSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadThresholds(): SizeBandThresholds {
    const config = vscode.workspace.getConfiguration("fileSizeViewer");
    const defaults: SizeBandThresholds = {
      greenMaxBytes: 1 * 1024 * 1024,
      yellowMinBytes: 1 * 1024 * 1024 + 1,
      yellowMaxBytes: 100 * 1024 * 1024,
      redMinBytes: 100 * 1024 * 1024 + 1,
    };

    const configured: SizeBandThresholds = {
      greenMaxBytes: config.get<number>(
        "greenMaxBytes",
        defaults.greenMaxBytes,
      ),
      yellowMinBytes: config.get<number>(
        "yellowMinBytes",
        defaults.yellowMinBytes,
      ),
      yellowMaxBytes: config.get<number>(
        "yellowMaxBytes",
        defaults.yellowMaxBytes,
      ),
      redMinBytes: config.get<number>("redMinBytes", defaults.redMinBytes),
    };

    const validationError = this.validateThresholds(configured);
    if (validationError) {
      void vscode.window.showWarningMessage(
        `File Size Viewer: invalid color thresholds (${validationError}). Falling back to defaults.`,
      );
      return defaults;
    }

    return configured;
  }

  private validateThresholds(thresholds: SizeBandThresholds): string | null {
    const entries: Array<[string, number]> = [
      ["greenMaxBytes", thresholds.greenMaxBytes],
      ["yellowMinBytes", thresholds.yellowMinBytes],
      ["yellowMaxBytes", thresholds.yellowMaxBytes],
      ["redMinBytes", thresholds.redMinBytes],
    ];

    for (const [name, value] of entries) {
      if (!Number.isFinite(value) || value < 0) {
        return `${name} must be a non-negative number`;
      }
    }

    if (thresholds.yellowMinBytes > thresholds.yellowMaxBytes) {
      return "yellowMinBytes must be less than or equal to yellowMaxBytes";
    }

    if (thresholds.greenMaxBytes >= thresholds.yellowMinBytes) {
      return "greenMaxBytes must be less than yellowMinBytes";
    }

    if (thresholds.yellowMaxBytes >= thresholds.redMinBytes) {
      return "yellowMaxBytes must be less than redMinBytes";
    }

    return null;
  }
}
