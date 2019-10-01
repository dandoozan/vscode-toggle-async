import { findEnclosingFunction, toggleAsync, isTypescript } from '../extension';
import { equal, fail } from 'assert';
import { workspace, window } from 'vscode';
import { generateBabelAst, setCursor } from '../utils';

describe('findEnclosingFunction', () => {
    const testCases = {
        javascript: [
            {
                desc: 'should return function declaration',
                code: 'function foo() {}',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
            {
                desc: 'should return function expression',
                code: 'var foo = function() {}',
                cursorPosition: 10,
                expectedStartOfFunction: 10,
            },
            {
                desc: 'should return arrow function',
                code: '() => {}',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
            {
                desc:
                    'should return arrow function with no block when the cursor is at the end',
                code: '() => true',
                cursorPosition: 10,
                expectedStartOfFunction: 0,
            },
            {
                desc: 'should return nested outer function',
                code: 'function foo() { function bar() {} }',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
            {
                desc: 'should return nested inner function',
                code: 'function foo() { function bar() {} }',
                cursorPosition: 17,
                expectedStartOfFunction: 17,
            },
            {
                desc: 'should return object method',
                code: '({ foo() {} })',
                cursorPosition: 3,
                expectedStartOfFunction: 3,
            },
            {
                desc: 'should return class method',
                code: 'class MyClass { foo(){} }',
                cursorPosition: 16,
                expectedStartOfFunction: 16,
            },
        ],
        javascriptreact: [
            {
                desc: 'should return function declaration',
                code: 'function foo() { return (<div/>); }',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
        ],
        typescript: [
            {
                desc: 'should return function declaration',
                code: 'function foo(param: boolean): boolean { return param; }',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
        ],
        typescriptreact: [
            {
                desc: 'should return function declaration',
                code:
                    'function foo(contents: string) { return (<div>contents</div>); }',
                cursorPosition: 0,
                expectedStartOfFunction: 0,
            },
        ],
    };

    for (const language in testCases) {
        describe(language, () => {
            testCases[language].forEach(
                ({ desc, code, cursorPosition, expectedStartOfFunction }) => {
                    it(desc, async () => {
                        const enclosingFunction = findEnclosingFunction(
                            generateBabelAst(code, isTypescript(language)),
                            cursorPosition
                        );
                        if (enclosingFunction) {
                            equal(
                                enclosingFunction.start,
                                expectedStartOfFunction
                            );
                        } else {
                            fail(
                                `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                            );
                        }
                    });
                }
            );
        });
    }
});

describe('toggleAsync', () => {
    const testCases = [
        {
            desc: 'should add async',
            startingCode: 'function foo() {}',
            cursorPosition: 0,
            endingCode: 'async function foo() {}',
        },
        {
            desc: 'should add async when the function contains "await"',
            startingCode: 'function foo() { await Promise.resolve(true); }',
            cursorPosition: 0,
            endingCode: 'async function foo() { await Promise.resolve(true); }',
        },
        {
            desc: 'should add async when the function is a static method',
            startingCode: 'class MyClass { static foo(){} }',
            cursorPosition: 16,
            endingCode: 'class MyClass { static async foo(){} }',
        },
        {
            desc: 'should remove async',
            startingCode: 'async function foo() {}',
            cursorPosition: 0,
            endingCode: 'function foo() {}',
        },
        {
            desc: 'should remove async when separated by a tab',
            startingCode: 'async	function foo() {}',
            cursorPosition: 0,
            endingCode: 'function foo() {}',
        },
        {
            desc: 'should remove async when separated by multiple spaces',
            startingCode: 'async  function foo() {}',
            cursorPosition: 0,
            endingCode: 'function foo() {}',
        },
        {
            desc: 'should remove async when the function is a static method',
            startingCode: 'class MyClass { static async foo(){} }',
            cursorPosition: 16,
            endingCode: 'class MyClass { static foo(){} }',
        },
    ];

    testCases.forEach(({ desc, startingCode, cursorPosition, endingCode }) => {
        it(desc, async () => {
            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            //set the cursor
            await setCursor(editor, cursorPosition);

            await toggleAsync();
            equal(doc.getText(), endingCode);
        });
    });
});
