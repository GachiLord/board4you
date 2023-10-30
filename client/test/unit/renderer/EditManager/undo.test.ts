import getTestCase from "./getTestCase"
import { test, describe } from "node:test"
import assert from "node:assert"


describe('unit/renderer/EditManager/undo', () => {
    // @ts-ignore
    global.location = {
        protocol: 'http',
        host: 'localhost'
    }
    test('undo should remove last shape', () => {
        const testCase = getTestCase(5)
        const lastShape = testCase.layer.children.at(-1)
        
        testCase.manager.undo()
    
        assert.ok(!testCase.layer.children.includes(lastShape))
    })
})