import store from "../../../../../src/desktop/renderer/store/store"
import getTestCase from "./getTestCase"

test('redo should return last removed shape', (done) => {
    const testCase = getTestCase(5)

    testCase.manager.undo()
    store.subscribe( () => {
        expect(testCase.layer.children).toHaveLength(5)
        done()
    } )
    
    testCase.manager.redo()
})