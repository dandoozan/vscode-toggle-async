//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../extension';

describe('findEnclosingFunction', () => {
    describe('Regular Functions', () => {
        const code = 'function foo() {}';

        it('should return the function when cursor is at start of function', async () => {
            const cursorPositionAsOffset = 0;
            const expectedStartOfFunction = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return the function when cursor is in middle of function', async () => {
            const cursorPositionAsOffset = Math.round(code.length / 2);
            const expectedStartOfFunction = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return null when cursor is at end of function', async () => {
            const cursorPositionAsOffset = code.length;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            assert.equal(enclosingFunction, null);
        });
    });

    describe('Arrow Functions', () => {
        let code = '() => {}';

        it('should return the function when cursor is at start of function', async () => {
            const cursorPositionAsOffset = 0;
            const expectedStartOfFunction = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return the function when cursor is in middle of function', async () => {
            const cursorPositionAsOffset = Math.round(code.length / 2);
            const expectedStartOfFunction = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return null when cursor is at end of function', async () => {
            const cursorPositionAsOffset = code.length;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            assert.equal(enclosingFunction, null);
        });

        it('should return the function when cursor at end of arrow function with no block', async () => {
            code = '() => true';

            const cursorPositionAsOffset = code.length;
            const expectedStartOfFunction = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });
    });

    describe('Nested Functions', () => {
        const code =
            'function outerFunction() {\n' + //line 0
            '    function middleFunction() {\n' + //line 1
            '        function innerFunction() {\n' + //line 2
            '            return true;\n' + //line 3
            '        }\n' +
            '    }\n' +
            '}\n';

        it('should return inner function when cursor is in nested function', async () => {
            const cursorLine = 3;
            const cursorCharacter = 0; //beginning of the line
            const expectedStartOfFunctionLine = 2;
            const expectedStartOfFunctionCharacter = 8;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                doc.offsetAt(new vscode.Position(cursorLine, cursorCharacter))
            );
            if (enclosingFunction) {
                assert.equal(
                    enclosingFunction.start,
                    doc.offsetAt(
                        new vscode.Position(
                            expectedStartOfFunctionLine,
                            expectedStartOfFunctionCharacter
                        )
                    )
                );
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return middle function when cursor is in middle nested function', async () => {
            const cursorLine = 2;
            const cursorCharacter = 0;
            const expectedStartOfFunctionLine = 1;
            const expectedStartOfFunctionCharacter = 4;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                doc.offsetAt(new vscode.Position(cursorLine, cursorCharacter))
            );
            if (enclosingFunction) {
                assert.equal(
                    enclosingFunction.start,
                    doc.offsetAt(
                        new vscode.Position(
                            expectedStartOfFunctionLine,
                            expectedStartOfFunctionCharacter
                        )
                    )
                );
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return outer function when cursor is in outer function', async () => {
            const cursorLine = 1;
            const cursorCharacter = 0;
            const expectedStartOfFunctionLine = 0;
            const expectedStartOfFunctionCharacter = 0;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                doc.offsetAt(new vscode.Position(cursorLine, cursorCharacter))
            );
            if (enclosingFunction) {
                assert.equal(
                    enclosingFunction.start,
                    doc.offsetAt(
                        new vscode.Position(
                            expectedStartOfFunctionLine,
                            expectedStartOfFunctionCharacter
                        )
                    )
                );
            } else {
                assert.fail(
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

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return the function when cursor is in middle of function', async () => {
            const cursorPositionAsOffset = Math.round(code.length / 2);
            const expectedStartOfFunction = startOfFunction;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            if (enclosingFunction) {
                assert.equal(enclosingFunction.start, expectedStartOfFunction);
            } else {
                assert.fail(
                    `findEnclosingFunction should return an object. It returned: ${enclosingFunction}`
                );
            }
        });

        it('should return null when cursor is at end of function', async () => {
            const cursorPositionAsOffset = endOfFunction;

            const doc = await vscode.workspace.openTextDocument({
                content: code,
                language: 'javascript',
            });
            const enclosingFunction = myExtension.findEnclosingFunction(
                doc,
                cursorPositionAsOffset
            );
            assert.equal(enclosingFunction, null);
        });
    });
});

describe('addAsync', () => {
    it('should add async to function', async () => {
        const startingCode = 'function foo() {}';
        const expectedEndingCode = 'async function foo() {}';

        const doc = await vscode.workspace.openTextDocument({
            content: startingCode,
            language: 'javascript',
        });
        const editor = await vscode.window.showTextDocument(doc);

        await myExtension.addAsync(editor, 0);
        assert.equal(doc.getText(), expectedEndingCode);
    });
});
