import {
    ExtensionContext,
    commands,
    window,
    TextEditor,
    Range,
    Selection,
} from 'vscode';
import { parse, ParserOptions } from '@babel/parser';
import { traverse, Node } from '@babel/types';
import { isArray } from 'lodash';

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

async function updateEditor(editor: TextEditor) {
    //I don't know of another way to update the editor without "editing" it,
    //so I'm just inserting an empty string at the beginning (ie. not changing
    //anything)
    await editor.edit(editBuilder => {
        editBuilder.insert(editor.document.positionAt(0), '');
    });
}

export async function setCursor(
    editor: TextEditor,
    offsets: number | number[]
) {
    if (!isArray(offsets)) {
        offsets = [offsets];
    }

    editor.selections = offsets.map(offset => {
        const pos = editor.document.positionAt(offset);
        return new Selection(pos, pos);
    });
    await updateEditor(editor);
}

export function getCursor(editor: TextEditor) {
    return editor.document.offsetAt(editor.selection.active);
}
export function getTextOfFile(editor: TextEditor) {
    return editor.document.getText();
}
export function getTextBetween(start: number, end: number, editor: TextEditor) {
    const doc = editor.document;
    return doc.getText(new Range(doc.positionAt(start), doc.positionAt(end)));
}

export function getLanguage(editor: TextEditor) {
    return editor.document.languageId;
}

export function notify(msg: any) {
    window.showInformationMessage(`[${getExtensionName()}] ${msg}`);
}

export function generateBabelAst(code: string, isTypeScript: boolean = false) {
    const parserOptions: ParserOptions = {
        sourceType: 'unambiguous', //auto-detect "script" vs "module" files

        //make the parser as lenient as possible
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,

        plugins: [
            // treat javascript files like jsx (since jsx is a superset of javascript)
            'jsx',

            //add experimental feature plugins (so that the
            //parser is more lenient when parsing code)
            'asyncGenerators',
            'bigInt',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            'doExpressions',
            'dynamicImport',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'functionBind',
            'functionSent',
            'importMeta',
            'logicalAssignment',
            'nullishCoalescingOperator',
            'numericSeparator',
            'objectRestSpread',
            'optionalCatchBinding',
            'optionalChaining',
            'partialApplication',
            'throwExpressions',
        ],
    };

    if (isTypeScript) {
        (parserOptions.plugins as string[]).push('typescript');
    }

    return parse(code, parserOptions);
}

export function traverseBabelAst(
    babelAst: Node,
    fnToApplyToEveryNode: Function
) {
    traverse(babelAst, {
        enter(babelNode) {
            fnToApplyToEveryNode(babelNode);
        },
    });
}
