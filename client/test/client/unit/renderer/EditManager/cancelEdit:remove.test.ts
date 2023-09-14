import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"
import { Edit } from "../../../../../src/renderer/lib/EditManager"

test('cancelEdit should return shape when type is "remove"', () => {
    const testCase = getTestCase(2)
    const shapeToRemove = testCase.layer.children.at(-1)

    if ( !(shapeToRemove instanceof Konva.Shape) ) throw new Error()

    const edit: Edit = {
        type: 'remove',
        shapes: [CanvasUtils.toShape(shapeToRemove)]
    }

    testCase.manager.applyEdit(edit)
    testCase.manager.cancelEdit(edit)

    expect(testCase.layer.children).toHaveLength(2)
})