import store from "../../../store/store"
import { acceptChanges } from "../../../features/history"


export default function drawAfterUndo(){
    const undoneCount = store.getState().history.canceledHistoryActions.length
    if (undoneCount > 0) store.dispatch(acceptChanges())
}