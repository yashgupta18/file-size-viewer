import * as vscode from "vscode";
import { FileSizeDecorationProvider } from "./FileDecorationProvider";

export function activate(context: vscode.ExtensionContext) {
  const decorationProvider = new FileSizeDecorationProvider();
  console.log("File size decoration provider is active");

  // Register file decoration provider
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider),
    decorationProvider,
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("fileSizeViewer.refresh", () => {
      decorationProvider.reloadConfiguration();
      return vscode.commands.executeCommand(
        "workbench.files.action.refreshFilesExplorer",
      );
    }),
  );

  // Listen for configuration changes and refresh file explorer
  context.subscriptions.push(
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
  );
}

export function deactivate() {}
