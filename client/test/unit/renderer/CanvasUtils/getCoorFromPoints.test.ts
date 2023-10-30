import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils";
import { test, describe } from "node:test"
import assert from "node:assert"


describe('unit/renderer/CanvasUtils/getCoorFromPoints', () => {
    test('should return points when length > 2 and coor is y', () => {
        const points = [22,33,44,777,11,21]
    
        const coor = CanvasUtils.getCoorFromPoints(points, 'y')
    
        assert.deepStrictEqual(coor, [33,777,21])
    })
    
    test('should return points when length > 2 and coor is x', () => {
        const points = [22,33,44,777,11,21]
    
        const coor = CanvasUtils.getCoorFromPoints(points, 'x')
    
        assert.deepStrictEqual(coor, [22,44,11])
    })
    
    test('should return points when length > 2 and coor is x', () => {
        const points = [22,33,44,777,11,21]
    
        const coor = CanvasUtils.getCoorFromPoints(points, 'x')
    
        assert.deepStrictEqual(coor, [22,44,11])
    })
    
    test('should return point when length == 2 and coor is y', () => {
        const points = [1,2]
    
        assert.deepStrictEqual(CanvasUtils.getCoorFromPoints(points, 'y'), [2])
    })
    
    test('should return point when length == 2 and coor is x', () => {
        const points = [1,2]
    
        assert.deepStrictEqual(CanvasUtils.getCoorFromPoints(points, 'x'), [1])
    })
    
    test('should return [] when length == 1 and coor is y', () => {
        const points = [1]
    
        assert.deepStrictEqual(CanvasUtils.getCoorFromPoints(points, 'y'), [])
    })
    
    test('should return [] when length == 0', () => {
        const points: number[] = []
    
        assert.deepStrictEqual(CanvasUtils.getCoorFromPoints(points, 'y'), [])
    })
})