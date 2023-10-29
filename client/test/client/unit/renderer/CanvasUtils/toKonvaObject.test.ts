import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import LineFactory from "../../../../../src/renderer/lib/NodeFactories/LineFactory";
import { test, describe } from "node:test"
import assert from "node:assert"



describe('toKonvaObject', () => {
    test('should convert connected field from Array to Set', () => {
        const factory = new LineFactory()
        const shapeObj = factory.create(1)[0]
        const shape = CanvasUtils.toShape(shapeObj)
    
        const konvaObject = CanvasUtils.toKonvaObject(shape)
        
        assert.deepEqual(konvaObject.attrs.connected, new Set(shape.connected))
    })
    
    test('should return same fields as in shape', () => {
        const factory = new LineFactory()
        const shapeObj = factory.create(1)[0]
        const shape = CanvasUtils.toShape(shapeObj)
    
        const konvaObject = CanvasUtils.toKonvaObject(shape)
        konvaObject.setAttr('connected', [...konvaObject.attrs.connected])
        
        const objKeys = Object.keys(konvaObject.attrs)
        const shapeKeys = Object.keys(shape)
        assert.ok(shapeKeys.every( key => objKeys.includes(key) ))
    })
})