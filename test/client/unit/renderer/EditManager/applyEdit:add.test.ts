import CanvasUtils from "../../../../../src/desktop/renderer/lib/CanvasUtils"
import LineFactory from "../../../../../src/desktop/renderer/lib/NodeFactories/LineFactory"
import getTestCase from "./getTestCase"

test('applyEdit should add shape when type is "add"', () => {
    const testCase = getTestCase(2)
    const shapeToAdd = new LineFactory().create(1)[0]

    testCase.manager.applyEdit({
        type: 'add',
        shape: CanvasUtils.toShape(shapeToAdd)
    })

    expect(testCase.layer.children).toHaveLength(3)
})