import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"
import { Edit } from "../../../../../src/renderer/lib/EditManager"
import { v4 as uuid } from 'uuid'

test('cancelEdit should return shape to initial when type is "modify"', () => {
    const testCase = getTestCase(2)
    const shapeToModify = testCase.layer.children.at(-1)

    if ( !(shapeToModify instanceof Konva.Shape) ) throw new Error()
    
    const edit: Edit = {
        id: uuid(),
        type: 'modify',
        current: [ {...CanvasUtils.toShape(shapeToModify), color: 'red'} ],
        initial: [CanvasUtils.toShape(shapeToModify)]
    }
    testCase.manager.applyEdit(edit)
    testCase.manager.cancelEdit(edit)

    expect(shapeToModify.attrs.color).not.toBe('red')
})