import boardEvents from "../../../base/constants/boardEvents";
import { addCurrent, addUndone, removeCurrent, removeUndone } from "../../../features/history";
import { setHeight } from "../../../features/stage";
import { PullData } from "../../../lib/BoardManager/typing";
import CanvasUtils from "../../../lib/CanvasUtils";
import EditManager from "../../../lib/EditManager";
import store from "../../../store/store";
import { convertToEdits } from "./convert";



export default function handlePull(editManager: EditManager, data: PullData) {
  // add missing edits
  convertToEdits(data.current.should_be_created_edits).forEach(edit => {
    store.dispatch(addCurrent(edit))
    editManager.applyEdit(edit)
  })
  convertToEdits(data.undone.should_be_created_edits).forEach(edit => {
    store.dispatch(addUndone(edit))
  })
  // delete extra edits
  data.current.should_be_deleted_ids.forEach(id => {
    const edit = store.getState().history.current.findLast(e => e.id === id)
    store.dispatch(removeCurrent(id as string))
    editManager.cancelEdit(edit)
  })
  data.undone.should_be_deleted_ids.forEach(id => {
    store.dispatch(removeUndone(id as string))
  })
  // update height
  store.dispatch(setHeight(
    CanvasUtils.getHeight(editManager.layer, store.getState().stage.baseHeight)
  ))
  boardEvents.emit('sizeHasChanged')
}
