'use strict';
import { isFunction, Node, Function } from '@babel/types';
import { TextDocument, Range, TextEditor, ExtensionContext } from 'vscode';
import { isArray, isObject, isNumber, sortBy } from 'lodash';
import { parse, ParserOptions } from '@babel/parser';
import {
    notify,
    getExtensionName,
    getCurrentEditor,
    getCursorPosition,
    addCommand,
} from './utils';

function generateAst(code: string, language: string) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    try {
        const parserOptions: ParserOptions = {
            sourceType: 'unambiguous', //auto-detect "script" files vs "module" files

            //make the parser as lenient as possible
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
        };

        //add "typescript" plugin if language is typescript
        if (language === 'typescript') {
            parserOptions.plugins = ['typescript'];
        }

        return parse(code, parserOptions);
    } catch (e) {
        console.log('​e=', e);
        notify(
            `[${getExtensionName()}] Failed to parse file to find enclosing function due to errors in the file. Please resolve errors in file and try again.`
        );
    }
    return null;
}

function extractAllFunctions(astNode: Node) {
    let functions: Function[] = [];

    //if the current child is an array, just call extractAllFunctions on all
    //it's elements
    if (isArray(astNode)) {
        //call extractAllFunctions on all children
        for (const item of astNode) {
            functions = functions.concat(extractAllFunctions(item));
        }
    } else if (isObject(astNode)) {
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
            if (isNumber(functionNode.start) && isNumber(functionNode.end)) {
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
            const sortedByStart = sortBy(enclosingFunctions, 'start');

            //return the last one, which will be the most enclosing one
            return sortedByStart[sortedByStart.length - 1];
        }
    }

    return null;
}

function isFunctionAsync(functionNode: Function) {
    return functionNode.async;
}

function findAsyncRange(document: TextDocument, startOfFunction: number) {
    //get the text from the start of function all the way to the end of the file
    const textFromStartOfFunctionToEndOfFile = document
        .getText()
        .substring(startOfFunction);

    //find the first occurrence of "async "
    const match = /\basync\s+/.exec(textFromStartOfFunctionToEndOfFile);
    if (match) {
        const startOfAsync = match.index;
        const endOfAsync = startOfAsync + match[0].length;
        return new Range(
            document.positionAt(startOfFunction + startOfAsync),
            document.positionAt(startOfFunction + endOfAsync)
        );
    }
}

async function removeAsync(editor: TextEditor, startOfFunction: number) {
    const asyncRange = findAsyncRange(editor.document, startOfFunction);
    if (asyncRange) {
        await editor.edit(editBuilder => {
            editBuilder.delete(asyncRange);
        });
    }
}
async function addAsync(editor: TextEditor, startOfFunction: number) {
    const startPositionOfFunction = editor.document.positionAt(startOfFunction);
    await editor.edit(editBuilder => {
        editBuilder.insert(startPositionOfFunction, 'async ');
    });
}

export async function toggleAsync() {
    const currentEditor = getCurrentEditor();

    if (currentEditor) {
        const doc = currentEditor.document;
        const fullTextOfFile = doc.getText();
        const languageOfFile = doc.languageId;

        const cursorLocationAsOffset = doc.offsetAt(
            getCursorPosition(currentEditor)
        );

        const enclosingFunctionNode = findEnclosingFunction(
            fullTextOfFile,
            languageOfFile,
            cursorLocationAsOffset
        );

        if (enclosingFunctionNode && isNumber(enclosingFunctionNode.start)) {
            if (isFunctionAsync(enclosingFunctionNode)) {
                await removeAsync(currentEditor, enclosingFunctionNode.start);
            } else {
                await addAsync(currentEditor, enclosingFunctionNode.start);
            }
        }
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    //register toggleAsync
    addCommand('augmentfunctions.toggleAsync', toggleAsync, context);

    //register toggleExport
    //todo: implement toggleExport
}

// this method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
