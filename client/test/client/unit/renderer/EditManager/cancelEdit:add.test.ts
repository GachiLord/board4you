import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"

test('cancelEdit should remove shape when type is "add"', () => {
    const testCase = getTestCase(2)
    const shapeToRemove = testCase.layer.children.at(-1)

    if ( !(shapeToRemove instanceof Konva.Shape) ) throw new Error()

    testCase.manager.cancelEdit({
        type: 'add',
        shape: CanvasUtils.toShape(shapeToRemove)
    })

    expect(testCase.layer.children).toHaveLength(1)
})