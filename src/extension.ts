'use strict';
import { isFunction, Node, Function, isBlockStatement } from '@babel/types';
import { Range, TextEditor, ExtensionContext } from 'vscode';
import { isNumber, maxBy } from 'lodash';
import {
    addCommand,
    getCurrentEditor,
    getCursor,
    getTextOfFile,
    getLanguage,
    generateBabelAst,
    notify,
    traverseBabelAst,
    getTextBetween,
} from './utils';

const LANGUAGES = {
    javascript: 'javascript',
    typescript: 'typescript',
};

function isLanguageSupported(language: string) {
    return !!LANGUAGES[language];
}

export function isTypescript(language: string) {
    return language === LANGUAGES.typescript;
}

function isEnclosing(node: Function, cursor: number) {
    if (node && isNumber(node.start) && isNumber(node.end)) {
        if (isBlockStatement(node.body)) {
            return cursor >= node.start && cursor < node.end;
        } else {
            //this is for the special case of an arrow function that has
            //a body not surrounded by curly braces (eg. "() => true");
            //in this case, the last char is still part of the function, so use "<="
            return cursor >= node.start && cursor <= node.end;
        }
    }
    return false;
}

function getEnclosingFunctions(ast: Node, cursor: number) {
    let functions: Function[] = [];
    traverseBabelAst(ast, (node: Node) => {
        if (isFunction(node) && isEnclosing(node, cursor)) {
            functions.push(node);
        }
    });
    return functions;
}

export function findEnclosingFunction(ast: Node | undefined, cursor: number) {
    if (ast) {
        const enclosingFunctions = getEnclosingFunctions(ast, cursor);

        //enclosingFunctions will have more than one element when there are
        //nested functions
        if (enclosingFunctions.length > 0) {
            //to get the "most" enclosing function, return the one with the
            //latest "start" location
            return maxBy(enclosingFunctions, 'start');
        }
    }

    return null;
}

function isFunctionAsync(functionNode: Function) {
    return functionNode.async;
}
function isFunctionStatic(functionNode: Function) {
    //note: i had to put "static" in quotes so that typescript doesn't complain
    //(it thinks that there is never a "static" property on Function (but there
    //is for static class methods (in typescript)!))
    return functionNode['static'];
}

function findAsyncRange(editor: TextEditor, functionNode: Function) {
    const startOfFunction = functionNode.start;
    if (isNumber(startOfFunction)) {
        const functionText = getTextBetween(
            functionNode.start as number,
            functionNode.end as number,
            editor
        );

        //find the first occurrence of "async "
        const match = /\basync\s+/.exec(functionText);
        if (match) {
            const startOfAsync = match.index;
            const endOfAsync = startOfAsync + match[0].length;
            return new Range(
                editor.document.positionAt(startOfFunction + startOfAsync),
                editor.document.positionAt(startOfFunction + endOfAsync)
            );
        }
    }
}

async function removeAsync(editor: TextEditor, functionNode: Function) {
    const asyncRange = findAsyncRange(editor, functionNode);
    if (asyncRange) {
        await editor.edit(editBuilder => {
            editBuilder.delete(asyncRange);
        });
    }
}
function findAsyncInsertPosition(editor: TextEditor, functionNode: Function) {
    const startOfFunction = functionNode.start;
    if (isNumber(startOfFunction)) {
        //by default, insert "async" at the beginning of the function
        let asyncInsertIndex = startOfFunction;

        //but if the function is a static class method, then insert "async"
        //after the "static" keyword
        if (isFunctionStatic(functionNode)) {
            const functionText = getTextBetween(
                functionNode.start as number,
                functionNode.end as number,
                editor
            );
            asyncInsertIndex += functionText.search(/\bstatic\s/) + 7;
        }

        return editor.document.positionAt(asyncInsertIndex);
    }
}
async function addAsync(editor: TextEditor, functionNode: Function) {
    const asyncInsertPosition = findAsyncInsertPosition(editor, functionNode);
    if (asyncInsertPosition) {
        await editor.edit(editBuilder => {
            editBuilder.insert(asyncInsertPosition, 'async ');
        });
    }
}

function prepTextForAstParsing(fullFileText: string) {
    //Remove all "await"s (and replace them with spaces of the same
    //length) in order to avoid a very common SyntaxError that is generated when
    //there is an "await" inside of a non-async function; indeed, that scenario
    //is the exact reason I made this extension (ie. when I had an "await"
    //inside a non-async function and needed to add "async" to it). I'm
    //replacing the removed "await"s with spaces to ensure that the "start" and
    //"end" locations of all the functions remain same.
    const textForAstParsing = fullFileText.replace(/\bawait\b/g, match =>
        ' '.repeat(match.length)
    );

    return textForAstParsing;
}

export async function toggleAsync() {
    const editor = getCurrentEditor();
    if (editor) {
        const language = getLanguage(editor);
        if (isLanguageSupported(language)) {
            const fullFileText = getTextOfFile(editor);
            const textToFeedIntoAstParser = prepTextForAstParsing(fullFileText);

            let ast;
            try {
                ast = generateBabelAst(
                    textToFeedIntoAstParser,
                    isTypescript(language)
                );
            } catch (error) {
                notify(
                    `Failed to parse file to find enclosing function.  Error received from parser: "${error.toString()}"`
                );
                return;
            }

            const enclosingFunctionNode = findEnclosingFunction(
                ast,
                getCursor(editor)
            );

            if (enclosingFunctionNode) {
                if (isFunctionAsync(enclosingFunctionNode)) {
                    await removeAsync(editor, enclosingFunctionNode);
                } else {
                    await addAsync(editor, enclosingFunctionNode);
                }
            }
        } else {
            notify(`Sorry, the "${language}" language is not supported.`);
        }
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    addCommand('toggle-async.toggleAsync', toggleAsync, context);
}

// this method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
