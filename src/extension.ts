import * as vscode from 'vscode';
import { FileSizeDecorationProvider } from './FileDecorationProvider';

export function activate(context: vscode.ExtensionContext) {
    const decorationProvider = new FileSizeDecorationProvider();
    console.log('File size decoration provider is active');
    // Register file decoration provider
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(decorationProvider));

    // Listen for configuration changes and refresh file explorer
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("fileSizeViewer")) {
            console.log("FileSizeViewer settings updated. Refreshing file explorer...");
            vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer");
        }
    });
}


export function deactivate() {}
