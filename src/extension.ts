import * as vscode from "vscode";
import { FileSizeDecorationProvider } from "./FileDecorationProvider";

export function activate(context: vscode.ExtensionContext) {
  const decorationProvider = new FileSizeDecorationProvider();
  console.log("File size decoration provider is active");

  // File system watchers for cache invalidation
  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/*");

  // Register all subscriptions
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider),
    decorationProvider,
    vscode.commands.registerCommand("fileSizeViewer.refresh", () => {
      decorationProvider.clearCache();
      decorationProvider.reloadConfiguration();
      return vscode.commands.executeCommand(
        "workbench.files.action.refreshFilesExplorer",
      );
    }),
    vscode.commands.registerCommand(
      "fileSizeViewer.copyFileSize",
      async (uri: vscode.Uri) => {
        if (!uri) {
          void vscode.window.showErrorMessage("No file or folder selected");
          return;
        }

        const size = await decorationProvider.getSize(uri.fsPath);
        if (size === null) {
          void vscode.window.showErrorMessage(
            "Could not determine size for this item",
          );
          return;
        }

        const formattedSize = decorationProvider.formatSizePublic(size);
        await vscode.env.clipboard.writeText(formattedSize);
        void vscode.window.showInformationMessage(
          `Copied size: ${formattedSize}`,
        );
      },
    ),
    vscode.commands.registerCommand(
      "fileSizeViewer.openLargestFile",
      async (uri: vscode.Uri) => {
        if (!uri) {
          void vscode.window.showErrorMessage("No folder selected");
          return;
        }

        const largest = await decorationProvider.findLargestFiles(
          uri.fsPath,
          1,
        );
        if (largest.length === 0) {
          void vscode.window.showInformationMessage(
            "No files found in this folder",
          );
          return;
        }

        const largestFile = largest[0];
        const formattedSize = decorationProvider.formatSizePublic(
          largestFile.size,
        );
        const fileUri = vscode.Uri.file(largestFile.path);

        // Open the file
        await vscode.window.showTextDocument(fileUri);
        void vscode.window.showInformationMessage(
          `Opened largest file: ${formattedSize}`,
        );
      },
    ),
    vscode.commands.registerCommand(
      "fileSizeViewer.showTopFiles",
      async (uri: vscode.Uri) => {
        if (!uri) {
          void vscode.window.showErrorMessage("No folder selected");
          return;
        }

        const topFiles = await decorationProvider.findLargestFiles(
          uri.fsPath,
          20,
        );
        if (topFiles.length === 0) {
          void vscode.window.showInformationMessage(
            "No files found in this folder",
          );
          return;
        }

        // Create quick pick items
        const items = topFiles.map((file) => ({
          label: `${decorationProvider.formatSizePublic(file.size)}`,
          description: file.path,
          filePath: file.path,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select a file to open",
          title: `Top ${topFiles.length} Largest Files`,
        });

        if (selected) {
          const fileUri = vscode.Uri.file(selected.filePath);
          await vscode.window.showTextDocument(fileUri);
        }
      },
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("fileSizeViewer")) {
        decorationProvider.reloadConfiguration();
        console.log(
          "FileSizeViewer settings updated. Refreshing file explorer...",
        );
        void vscode.commands.executeCommand(
          "workbench.files.action.refreshFilesExplorer",
        );
      }
    }),
    fileWatcher.onDidCreate((uri) => {
      decorationProvider.invalidatePath(uri.fsPath);
    }),
    fileWatcher.onDidChange((uri) => {
      decorationProvider.invalidatePath(uri.fsPath);
    }),
    fileWatcher.onDidDelete((uri) => {
      decorationProvider.invalidatePath(uri.fsPath);
    }),
    fileWatcher,
  );

  console.log("[INFO] Extension activated!");
}

export function deactivate() {
  // Cleanup is handled by dispose() methods in subscriptions
}
