import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils"
import { v4 as uuid } from 'uuid'
import { test, describe } from "node:test"
import assert from "node:assert"

describe('unit/renderer/EditManager/applyEdit:remove', () => {
    // @ts-ignore
    global.location = {
        protocol: 'http',
        host: 'localhost'
    }
    test('applyEdit should remove shape when type is "remove"', () => {
        const testCase = getTestCase(2)
        const shapeToRemove = testCase.layer.children.at(-1)
    
        if ( !(shapeToRemove instanceof Konva.Shape) ) throw new Error()
    
        testCase.manager.applyEdit({
            id: uuid(),
            type: 'remove',
            shapes: [CanvasUtils.toShape(shapeToRemove)]
        })
    
        assert.ok(!testCase.layer.children.includes(shapeToRemove))
    })
})