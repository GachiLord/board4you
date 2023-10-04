import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils"
import LineFactory from "../../../../../src/renderer/lib/NodeFactories/LineFactory"
import getTestCase from "./getTestCase"
import { v4 as uuid } from 'uuid'

test('applyEdit should add shape when type is "add"', () => {
    const testCase = getTestCase(2)
    const shapeToAdd = new LineFactory().create(1)[0]

    testCase.manager.applyEdit({
        id: uuid(),
        type: 'add',
        shape: CanvasUtils.toShape(shapeToAdd)
    })

    expect(testCase.layer.children).toHaveLength(3)
})