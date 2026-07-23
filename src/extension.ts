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
