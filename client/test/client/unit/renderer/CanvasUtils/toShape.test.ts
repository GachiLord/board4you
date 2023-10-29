import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import LineFactory from "../../../../../src/renderer/lib/NodeFactories/LineFactory";
import { test, describe } from "node:test"
import assert from "node:assert"



describe('toShape', () => {
    test('should not return undefined fields', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    shapeObj.setAttr('undefinedField', undefined)
    const shape = CanvasUtils.toShape(shapeObj)

    assert.ok(!shape)
})

test('should return same fields as in shapeObj', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    const shape = CanvasUtils.toShape(shapeObj)
    // convert connected to array to run test
    shapeObj.setAttr('connected', [...shape.connected])
    
    assert.deepStrictEqual(shapeObj.attrs, shape)
})

test('should convert connected field from Set to Array', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    const shape = CanvasUtils.toShape(shapeObj)
    
    assert.deepStrictEqual(shapeObj.attrs.connected, new Set(shape.connected))
})
})