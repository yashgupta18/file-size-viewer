import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

interface SizeBandThresholds {
  greenMaxBytes: number;
  yellowMinBytes: number;
  yellowMaxBytes: number;
  redMinBytes: number;
}

interface CacheEntry {
  size: number;
  timestamp: number;
}

interface Configuration {
  thresholds: SizeBandThresholds;
  excludePatterns: string[];
  maxRecursionDepth: number;
  enableFolderSizeCalculation: boolean;
  enableCache: boolean;
}

export class FileSizeDecorationProvider
  implements vscode.FileDecorationProvider, vscode.Disposable
{
  private readonly onDidChangeFileDecorationsEmitter = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[]
  >();
  public readonly onDidChangeFileDecorations =
    this.onDidChangeFileDecorationsEmitter.event;
  private config: Configuration;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_MAX_AGE = 60000; // 1 minute in milliseconds

  constructor() {
    this.config = this.loadConfiguration();
  }

  public dispose(): void {
    this.onDidChangeFileDecorationsEmitter.dispose();
    this.cache.clear();
  }

  public reloadConfiguration(): void {
    this.config = this.loadConfiguration();
    this.clearCache();
    this.onDidChangeFileDecorationsEmitter.fire([]);
  }

  public clearCache(): void {
    this.cache.clear();
    console.log("[FileSizeViewer] Cache cleared");
  }

  public invalidatePath(filePath: string): void {
    // Invalidate the specific path and all parent directories
    const normalizedPath = path.normalize(filePath);

    // Remove the exact path
    this.cache.delete(normalizedPath);

    // Remove all parent directories up to workspace root
    let currentPath = path.dirname(normalizedPath);
    while (currentPath && currentPath !== path.dirname(currentPath)) {
      this.cache.delete(currentPath);
      currentPath = path.dirname(currentPath);
    }

    console.log(`[FileSizeViewer] Invalidated cache for: ${filePath}`);
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
    const normalizedPath = path.normalize(filePath);

    // Check cache first if enabled
    if (this.config.enableCache) {
      const cached = this.cache.get(normalizedPath);
      if (cached && Date.now() - cached.timestamp < this.CACHE_MAX_AGE) {
        return cached.size;
      }
    }

    try {
      const stats = await fs.promises.stat(filePath);

      let size: number | null = null;

      if (stats.isFile()) {
        size = stats.size;
      } else if (stats.isDirectory()) {
        if (this.config.enableFolderSizeCalculation) {
          size = await this.getFolderSize(filePath, 0);
        } else {
          // Return null for directories when folder calculation is disabled
          return null;
        }
      }

      // Cache the result if enabled
      if (size !== null && this.config.enableCache) {
        this.cache.set(normalizedPath, {
          size,
          timestamp: Date.now(),
        });
      }

      return size;
    } catch {
      return null;
    }
  }

  private async getFolderSize(
    folderPath: string,
    depth: number,
  ): Promise<number> {
    // Check depth limit
    if (depth >= this.config.maxRecursionDepth) {
      console.log(
        `[FileSizeViewer] Max recursion depth reached at: ${folderPath}`,
      );
      return 0;
    }

    let totalSize = 0;

    try {
      const files = await fs.promises.readdir(folderPath);

      for (const file of files) {
        // Check if file/folder should be excluded
        if (this.shouldExclude(file)) {
          continue;
        }

        const filePath = path.join(folderPath, file);

        try {
          const stats = await fs.promises.stat(filePath);

          if (stats.isFile()) {
            totalSize += stats.size;
          } else if (stats.isDirectory()) {
            totalSize += await this.getFolderSize(filePath, depth + 1);
          }
        } catch {
          // Skip files/folders that can't be accessed (permission denied, symlinks, etc.)
        }
      }
    } catch (error) {
      console.error(`Error calculating folder size: ${folderPath}`, error);
    }

    return totalSize;
  }

  private shouldExclude(fileName: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      // Simple matching: exact name or basic glob patterns
      if (pattern === fileName) {
        return true;
      }

      // Support wildcards like *.log
      if (pattern.includes("*")) {
        const regexPattern = pattern
          .replaceAll(".", String.raw`\.`)
          .replaceAll("*", ".*");
        if (new RegExp(`^${regexPattern}$`).test(fileName)) {
          return true;
        }
      }
    }

    return false;
  }

  private getSizeBadge(size: number): string {
    const thresholds = this.config.thresholds;

    if (size <= thresholds.greenMaxBytes) {
      return "🟢";
    }

    if (
      size >= thresholds.yellowMinBytes &&
      size <= thresholds.yellowMaxBytes
    ) {
      return "🟡";
    }

    if (size >= thresholds.redMinBytes) {
      return "🔴";
    }

    // Fill potential gaps between configured bands while preserving monotonic color progression.
    if (size < thresholds.yellowMinBytes) {
      return "🟢";
    }

    if (size < thresholds.redMinBytes) {
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

  private loadConfiguration(): Configuration {
    const config = vscode.workspace.getConfiguration("fileSizeViewer");

    const thresholds = this.loadThresholds();
    const excludePatterns = config.get<string[]>("excludePatterns", [
      "node_modules",
      ".git",
      "dist",
      "out",
      "build",
      ".vscode",
    ]);
    const maxRecursionDepth = config.get<number>("maxRecursionDepth", 10);
    const enableFolderSizeCalculation = config.get<boolean>(
      "enableFolderSizeCalculation",
      true,
    );
    const enableCache = config.get<boolean>("enableCache", true);

    return {
      thresholds,
      excludePatterns,
      maxRecursionDepth,
      enableFolderSizeCalculation,
      enableCache,
    };
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
