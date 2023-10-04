import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"
import { v4 as uuid } from 'uuid'

test('applyEdit should modify shape when type is "modify"', () => {
    const testCase = getTestCase(2)
    const shapeToModify = testCase.layer.children.at(-1)

    if ( !(shapeToModify instanceof Konva.Shape) ) throw new Error()

    testCase.manager.applyEdit({
        id: uuid(),
        type: 'modify',
        current: [ {...CanvasUtils.toShape(shapeToModify), color: 'red'} ],
        initial: [CanvasUtils.toShape(shapeToModify)]
    })

    expect(shapeToModify.attrs.color).toBe('red')
})