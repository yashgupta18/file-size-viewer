import * as vscode from 'vscode';
import { FileSizeDecorationProvider } from './FileDecorationProvider';

export function activate(context: vscode.ExtensionContext) {
    const decorationProvider = new FileSizeDecorationProvider();
    console.log('File size decoration provider is active');
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(decorationProvider));
}

export function deactivate() {}
