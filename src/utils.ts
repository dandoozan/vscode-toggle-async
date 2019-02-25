import { ExtensionContext, commands, window, TextEditor } from 'vscode';
import { parse, ParserOptions } from '@babel/parser';

export function addCommand(
    name: string,
    fn: (...args: any[]) => any,
    context: ExtensionContext
) {
    let toggleAsyncCommand = commands.registerCommand(name, fn);
    context.subscriptions.push(toggleAsyncCommand);
}

export function getExtensionName() {
    const packageJson = require('../package.json');
    return packageJson.displayName;
}

export function getCurrentEditor() {
    return window.activeTextEditor;
}

export function getCursor(editor: TextEditor) {
    return editor.document.offsetAt(editor.selection.active);
}
export function getTextOfFile(editor: TextEditor) {
    return editor.document.getText();
}

export function getLanguage(editor: TextEditor) {
    return editor.document.languageId;
}

export function notify(msg: any) {
    window.showInformationMessage(`[${getExtensionName()}] ${msg}`);
}

export function generateAst(code: string, isTypeScript: boolean = false) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    const parserOptions: ParserOptions = {
        sourceType: 'unambiguous', //auto-detect "script" files vs "module" files

        //make the parser as lenient as possible
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
    };

    //add "typescript" plugins if language is typescript
    if (isTypeScript) {
        parserOptions.plugins = [
            'typescript',
            'classProperties',
            'dynamicImport',
        ];
    }

    try {
        return parse(code, parserOptions);
    } catch (error) {
        // console.log('​error=', error);
    }
}
