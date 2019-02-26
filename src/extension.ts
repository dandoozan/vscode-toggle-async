'use strict';
import { isFunction, Node, Function, isBlockStatement } from '@babel/types';
import { TextDocument, Range, TextEditor, ExtensionContext } from 'vscode';
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
} from './utils';

const LANGUAGES = {
    javascript: 'javascript',
    typescript: 'typescript',
};

function isLanguageSupported(language: string) {
    return !!LANGUAGES[language];
}

function isTypescript(language: string) {
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
            const ast = generateBabelAst(
                textToFeedIntoAstParser,
                isTypescript(language)
            );

            if (ast) {
                const enclosingFunctionNode = findEnclosingFunction(
                    ast,
                    getCursor(editor)
                );

                if (
                    enclosingFunctionNode &&
                    isNumber(enclosingFunctionNode.start)
                ) {
                    if (isFunctionAsync(enclosingFunctionNode)) {
                        await removeAsync(editor, enclosingFunctionNode.start);
                    } else {
                        await addAsync(editor, enclosingFunctionNode.start);
                    }
                }
            } else {
                notify(
                    `Failed to parse file to find enclosing function.  Please resolve any errors in the file and try again.`
                );
            }
        } else {
            notify(`The "${language}" language is not supported yet.`);
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
