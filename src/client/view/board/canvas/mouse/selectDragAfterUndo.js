import store from "../../../store/store"
import { clearUndone } from "../../../features/history"


export default selectDragAfterUndo = () => {
    const undoneCount = store.getState().history.canceledHistoryActions.length
    if (undoneCount > 0) store.dispatch(clearUndone())
}