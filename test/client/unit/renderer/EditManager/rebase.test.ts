import store from "../../../../../src/desktop/renderer/store/store"
import getTestCase from "./getTestCase"

test('rebase should empty undone changes in store', (done) => {
    const testCase = getTestCase(1)

    store.subscribe( () => {
        expect(store.getState().history.undone).toHaveLength(0)
        done()
    } )

    testCase.manager.rebase()
})