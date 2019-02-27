import { findEnclosingFunction, toggleAsync } from '../extension';
import { equal, fail } from 'assert';
import { workspace, window } from 'vscode';
import { generateBabelAst, setCursor } from '../utils';

describe('findEnclosingFunction', () => {
    describe('Javascript', () => {
        it('should return function declaration', async () => {
            const code = 'function foo() {}';
            const cursorPositionAsOffset = 0;
            const expectedStartOfFunction = 0;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return function expression', async () => {
            const code = 'var foo = function() {}';
            const cursorPositionAsOffset = 10;
            const expectedStartOfFunction = 10;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return arrow function', async () => {
            let code = '() => {}';
            const cursorPositionAsOffset = 0;
            const expectedStartOfFunction = 0;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return arrow function with no block when the cursor is at the end', async () => {
            let code = '() => true';

            const cursorPositionAsOffset = code.length;
            const expectedStartOfFunction = 0;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return nested inner function', async () => {
            const code =
                'function outerFunction() {\n' + //line 0
                '    function innerFunction() {\n' + //line 2
                '        return true;\n' + //line 3
                '    }\n' +
                '}\n';
            const cursorPositionAsOffset = code.indexOf('innerFunction');
            const expectedStartOfFunction = code.indexOf(
                'function innerFunction'
            );

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return nested outer function', async () => {
            const code =
                'function outerFunction() {\n' + //line 0
                '    function innerFunction() {\n' + //line 2
                '        return true;\n' + //line 3
                '    }\n' +
                '}\n';
            const cursorPositionAsOffset = code.indexOf('outerFunction');
            const expectedStartOfFunction = code.indexOf(
                'function outerFunction'
            );

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return method', async () => {
            const code = '({ foo() {} })';
            const startOfFunction = 3;
            const endOfFunction = 11;
            const cursorPositionAsOffset = startOfFunction;
            const expectedStartOfFunction = startOfFunction;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });
    });

    describe('Typescript', () => {
        it('should return function declaration', async () => {
            const code =
                'function foo(param: boolean): boolean { return param; }';
            const cursorPositionAsOffset = 0;
            const expectedStartOfFunction = 0;

            const enclosingFunction = findEnclosingFunction(
                generateBabelAst(code, true),
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });
    });
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
