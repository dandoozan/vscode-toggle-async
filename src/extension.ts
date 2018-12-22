'use strict';
import * as vscode from 'vscode';
import * as utils from './utils';
import * as babelParser from '@babel/parser';
import * as _ from 'lodash';
import { isFunction, Node, Function } from '@babel/types';

function generateAst(code: string, language: string) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    try {
        const parserOptions: babelParser.ParserOptions = {
            sourceType: 'unambiguous', //auto-detect "script" files vs "module" files

            //make the parser as lenient as possible
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
        };

        //add "typescript" plugin if language is typescript
        if (language === 'typescript') {
            parserOptions.plugins = [ 'typescript' ];
        }

        return babelParser.parse(code, parserOptions);
    } catch (e) {
        utils.notify(
            `[${utils.getExtensionName()}] Failed to parse file to find enclosing function due to errors in the file. Please resolve errors and try again.`
        );
    }
    return null;
}

function extractAllFunctions(astNode: Node) {
    let functions: Function[] = [];

    //if the current child is an array, just call extractAllFunctions on all
    //it's elements
    if (_.isArray(astNode)) {
        //call extractAllFunctions on all children
        for (const item of astNode) {
            functions = functions.concat(extractAllFunctions(item));
        }
    } else if (_.isObject(astNode)) {
        //check if it's a function node
        if (isFunction(astNode)) {
            //if so, add it to functions
            functions.push(astNode);
        }
        //then call extractAllFunctions on all children
        for (const key in astNode) {
            if (astNode.hasOwnProperty(key)) {
                functions = functions.concat(extractAllFunctions(astNode[key]));
            }
        }
    }
    return functions;
}

export function findEnclosingFunction(
    code: string,
    language: string,
    cursorLocationAsOffset: number
) {
    //parse file
    const ast = generateAst(code, language);
    if (ast) {
        const allFunctions = extractAllFunctions(ast);

        //enclosingFunctions will have more than one element when there are
        //nested functions
        const enclosingFunctions = allFunctions.filter(functionNode => {
            if (
                _.isNumber(functionNode.start) &&
                _.isNumber(functionNode.end)
            ) {
                if (functionNode.body.type === 'BlockStatement') {
                    return (
                        cursorLocationAsOffset >= functionNode.start &&
                        cursorLocationAsOffset < functionNode.end
                    );
                } else {
                    //this is for the special case of an arrow function that has
                    //a body not surrounded by curly braces (eg. "() => true");
                    //in this case, the last char is still part of the function.
                    return (
                        cursorLocationAsOffset >= functionNode.start &&
                        cursorLocationAsOffset <= functionNode.end
                    );
                }
            }
            return false;
        });

        if (enclosingFunctions.length > 0) {
            //sort by "start"
            const sortedByStart = _.sortBy(enclosingFunctions, 'start');

            //return the last one, which will be the most enclosing one
            return sortedByStart[sortedByStart.length - 1];
        }
    }

    return null;
}

function isFunctionAsync(functionNode: Function) {
    return functionNode.async;
}

function getFunctionText(
    document: vscode.TextDocument,
    functionNode: Function
) {
    if (_.isNumber(functionNode.start) && _.isNumber(functionNode.end)) {
        return document.getText(
            new vscode.Range(
                document.positionAt(functionNode.start),
                document.positionAt(functionNode.end)
            )
        );
    }
    return '';
}

function findAsyncRange(document: vscode.TextDocument, functionText: string) {
    const match = /\basync\s+/.exec(functionText);
    if (match) {
        const startOfAsync = match.index;
        const endOfAsync = match[0].length;
        return new vscode.Range(
            document.positionAt(startOfAsync),
            document.positionAt(endOfAsync)
        );
    }
}

export async function removeAsync(
    editor: vscode.TextEditor,
    functionText: string
) {
    const asyncRange = findAsyncRange(editor.document, functionText);
    if (asyncRange) {
        await editor.edit(editBuilder => {
            editBuilder.delete(asyncRange);
        });
    }
}
export async function addAsync(
    editor: vscode.TextEditor,
    startOfFunctionAsOffset: number | null
) {
    if (_.isNumber(startOfFunctionAsOffset)) {
        const startOfFunction = editor.document.positionAt(
            startOfFunctionAsOffset
        );
        await editor.edit(editBuilder => {
            editBuilder.insert(startOfFunction, 'async ');
        });
    }
}

async function toggleAsync() {
    const currentEditor = utils.getCurrentEditor();

    if (currentEditor) {
        const doc = currentEditor.document;

        const cursorLocationAsOffset = doc.offsetAt(
            utils.getCursorPosition(currentEditor)
        );

        const enclosingFunctionNode = findEnclosingFunction(
            doc.getText(),
            doc.languageId,
            cursorLocationAsOffset
        );

        if (enclosingFunctionNode) {
            //tbx
            // const pos = doc.positionAt(
            //     enclosingFunctionNode.start as number
            // );
            // utils.notify(`start: line=${pos.line}, char=${pos.character}`);

            const startOfFunctionAsOffset = enclosingFunctionNode.start;
            if (isFunctionAsync(enclosingFunctionNode)) {
                //if there is an async on the function, remove it
                await removeAsync(
                    currentEditor,
                    getFunctionText(doc, enclosingFunctionNode)
                );
            } else {
                //else, add "async" to the start of the function
                await addAsync(currentEditor, startOfFunctionAsOffset);
            }
        } else {
            // utils.notify('No enclosing function found');
        }
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    //register toggleAsync
    utils.setupCommand('augmentfunctions.toggleAsync', toggleAsync, context);

    //register toggleExport
    //todo: implement toggleExport
}

// this method is called when your extension is deactivated
export function deactivate() {}
