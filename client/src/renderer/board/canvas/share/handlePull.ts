import boardEvents from "../../../base/constants/boardEvents";
import { addCurrent, addUndone, removeCurrent, removeUndone } from "../../../features/history";
import { setHeight } from "../../../features/stage";
import CanvasUtils from "../../../lib/CanvasUtils";
import EditManager from "../../../lib/EditManager";
import store from "../../../store/store";
import { EditEnum, convertToEdits } from "./convert";


interface editData {
  should_be_created_edits: EditEnum[],
  should_be_deleted_ids: string[]
}
interface pushData {
  current: editData,
  undone: editData
}

export default function handlePush(editManager: EditManager, data: pushData) {
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
    store.dispatch(removeCurrent(id))
    editManager.cancelEdit(edit)
  })
  data.undone.should_be_deleted_ids.forEach(id => {
    store.dispatch(removeUndone(id))
  })
  // update height
  store.dispatch(setHeight(
    CanvasUtils.getHeight(editManager.layer, store.getState().stage.baseHeight)
  ))
  boardEvents.emit('sizeHasChanged')
}
