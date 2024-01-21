import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils";
import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory";
import { test, describe } from "node:test"
import assert from "node:assert"



describe('unit/renderer/CanvasUtils/toShape', () => {
  test('should not return undefined fields', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    shapeObj.setAttr('undefinedField', undefined)
    const shape = CanvasUtils.toShape(shapeObj)

    assert.ok(Object.values(shape).every(attr => attr !== undefined))
  })


  test('should convert connected field from Set to Array', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    const shape = CanvasUtils.toShape(shapeObj)

    assert.deepStrictEqual(shapeObj.attrs.connected, new Set(shape.connected))
  })
})
