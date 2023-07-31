import getTestCase from "./getTestCase"

test('undo should remove last shape', () => {
    const testCase = getTestCase(5)
    const lastShape = testCase.layer.children.at(-1)
    
    testCase.manager.undo()

    expect(testCase.layer.children).not.toContain(lastShape)
})