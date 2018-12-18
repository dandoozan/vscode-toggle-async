import * as vscode from 'vscode';

export function setupCommand(
    name: string,
    fn: (...args: any[]) => any,
    context: vscode.ExtensionContext
) {
    let toggleAsyncCommand = vscode.commands.registerCommand(name, fn);
    context.subscriptions.push(toggleAsyncCommand);
}

export function getExtensionName() {
    const packageJson = require('../package.json');
    return packageJson.displayName;
}

export function getCurrentEditor() {
    return vscode.window.activeTextEditor;
}

export function getCursorPosition(editor: vscode.TextEditor) {
    return editor.selection.active;
}

export function notify(msg: any) {
    vscode.window.showInformationMessage('' + msg);
}
