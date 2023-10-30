import store from "../../../../src/renderer/store/store"
import getTestCase from "./getTestCase"
import { test, describe } from "node:test"
import assert from "node:assert"


describe('unit/renderer/EditManager/rebase', () => {
    // @ts-ignore
    global.location = {
        protocol: 'http',
        host: 'localhost'
    }
    test('rebase should empty undone changes in store', (_, done) => {
        const testCase = getTestCase(1)
    
        store.subscribe( () => {
            assert.equal(store.getState().history.undone.length, 0)
            done()
        } )
    
        testCase.manager.rebase()
    })
})