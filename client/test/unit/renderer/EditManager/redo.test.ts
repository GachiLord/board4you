import store from "../../../../src/renderer/store/store"
import getTestCase from "./getTestCase"
import { test, describe } from "node:test"
import assert from "node:assert"


describe('unit/renderer/EditManager/redo', () => {
    // @ts-ignore
    global.location = {
        protocol: 'http',
        host: 'localhost'
    }
    test('redo should add last removed shape', (_, done) => {
        const testCase = getTestCase(5)
    
        testCase.manager.undo()
        store.subscribe( () => {
            assert.equal(testCase.layer.children.length, 5)
            done()
        } )
        
        testCase.manager.redo()
    })
})