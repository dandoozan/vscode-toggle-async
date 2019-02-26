import { findEnclosingFunction, toggleAsync } from '../extension';
import { equal, fail } from 'assert';
import { workspace, window } from 'vscode';
import {
    generateBabelAst,
    setCursor,
} from '../utils';

describe('findEnclosingFunction', () => {
    describe('Javascript', () => {
        describe('Regular Functions', () => {
            const code = 'function foo() {}';

            it('should return the function when cursor is at start of function', async () => {
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

            it('should return null when cursor is at end of function', async () => {
                const cursorPositionAsOffset = code.length;

                const enclosingFunction = findEnclosingFunction(
                    generateBabelAst(code),
                    cursorPositionAsOffset
                );
                equal(enclosingFunction, null);
            });
        });

        describe('Arrow Functions', () => {
            let code = '() => {}';

            it('should return the function when cursor is at start of function', async () => {
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

            it('should return null when cursor is at end of function', async () => {
                const cursorPositionAsOffset = code.length;

                const enclosingFunction = findEnclosingFunction(
                    generateBabelAst(code),
                    cursorPositionAsOffset
                );
                equal(enclosingFunction, null);
            });

            it('should return the function when cursor at end of arrow function with no block', async () => {
                code = '() => true';

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
        });

        describe('Nested Functions', () => {
            const code =
                'function outerFunction() {\n' + //line 0
                '    function innerFunction() {\n' + //line 2
                '        return true;\n' + //line 3
                '    }\n' +
                '}\n';

            it('should return inner function when cursor is in nested function', async () => {
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

            it('should return outer function when cursor is in outer function', async () => {
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
        });

        describe('Methods', () => {
            const code = '({ foo() {} })';
            const startOfFunction = 3;
            const endOfFunction = 11;

            it('should return the function when cursor is at start of function', async () => {
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

            it('should return null when cursor is at end of function', async () => {
                const cursorPositionAsOffset = endOfFunction;

                const enclosingFunction = findEnclosingFunction(
                    generateBabelAst(code),
                    cursorPositionAsOffset
                );
                equal(enclosingFunction, null);
            });
        });
    });

    describe('Typescript', () => {
        describe('Regular Functions', () => {
            const code =
                'function foo(param: boolean): boolean { return param; }';

            it('should return the function when cursor is at start of function', async () => {
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
            
            it('should return null when cursor is at end of function', async () => {
                const cursorPositionAsOffset = code.length;

                const enclosingFunction = findEnclosingFunction(
                    generateBabelAst(code, true),
                    cursorPositionAsOffset
                );
                equal(enclosingFunction, null);
            });
        });
    });
});

describe('toggleAsync', () => {
    describe('Adding async', () => {
        it('should add async', async () => {
            const startingCode = 'function foo() {}';
            const expectedEndingCode = 'async function foo() {}';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });

        it('should add async when the function contains "await"', async () => {
            const startingCode =
                'function foo() { await Promise.resolve(true); }';
            const expectedEndingCode =
                'async function foo() { await Promise.resolve(true); }';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });

        it('should add async when the function is a static method', async () => {
            const startingCode = `class MyClass { static foo(){} }`;
            const cursorPositionAsOffset = 16;
            const expectedEndingCode = 'class MyClass { static async foo(){} }';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);
            await setCursor(editor, cursorPositionAsOffset);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });
    });

    describe('Removing async', () => {
        it('should remove async', async () => {
            const startingCode = 'async function foo() {}';
            const expectedEndingCode = 'function foo() {}';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });

        it('should remove async when separated by a tab', async () => {
            const startingCode = 'async	function foo() {}';
            const expectedEndingCode = 'function foo() {}';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });

        it('should remove async when separated by multiple spaces', async () => {
            const startingCode = 'async  function foo() {}';
            const expectedEndingCode = 'function foo() {}';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });

        it('should remove async when the function is a static method', async () => {
            const startingCode = `class MyClass { static async foo(){} }`;
            const cursorPositionAsOffset = 16;
            const expectedEndingCode = 'class MyClass { static foo(){} }';

            const doc = await workspace.openTextDocument({
                content: startingCode,
                language: 'javascript',
            });

            //show it so that it's the "activeTextEditor"
            const editor = await window.showTextDocument(doc);
            await setCursor(editor, cursorPositionAsOffset);

            await toggleAsync();
            equal(doc.getText(), expectedEndingCode);
        });
    });
});
