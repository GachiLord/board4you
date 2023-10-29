import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import { test, describe } from "node:test"
import assert from "node:assert"


describe('retrivePossibleFields', () => {
    test('should return empty object if there are no possible fields', () => {
        const fields = { a: 0, b: 0 }
    
        const retrived = CanvasUtils.retrivePossibleFields(fields)
    
        assert.deepStrictEqual(retrived, {})
    })
    
    test('should return object if there are possible fields', () => {
        const fields = { height: 10, width: 423, shapeId: '4321' }
    
        const retrived = CanvasUtils.retrivePossibleFields(fields)
    
        assert.deepStrictEqual(retrived, fields)
    })
    
    test('should return object if there are possible and impossible fields', () => {
        const fields = { height: 10, 'impossible field': true }
    
        const retrived = CanvasUtils.retrivePossibleFields(fields)
    
        assert.deepStrictEqual(retrived, {height: 10})
    })
    
    test('should convert connected field from Set to Array', () => {
        const fields = { height: 10, connected: new Set(['123','234','345']) }
    
        const retrived = CanvasUtils.retrivePossibleFields(fields)
    
        assert.deepStrictEqual(retrived, {height: 10, connected: ['123','234','345']})
    })
})