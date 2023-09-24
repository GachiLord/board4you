import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"

test('applyEdit should remove shape when type is "remove"', () => {
    const testCase = getTestCase(2)
    const shapeToRemove = testCase.layer.children.at(-1)

    if ( !(shapeToRemove instanceof Konva.Shape) ) throw new Error()

    testCase.manager.applyEdit({
        type: 'remove',
        shapes: [CanvasUtils.toShape(shapeToRemove)]
    })

    expect(testCase.layer.children).toHaveLength(1)
})