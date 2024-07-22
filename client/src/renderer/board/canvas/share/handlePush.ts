import { addCurrent } from "../../../features/history"
import { Edit } from "../../../lib/BoardManager/typing"
import EditManager from "../../../lib/EditManager"
import store from "../../../store/store"

export default function handlePush(editManager: EditManager, data: Edit[]) {
  data.forEach(e => {
    const edit = e.edit
    let processed = null
    if (edit.Add !== undefined) processed = edit.Add
    if (edit.Remove !== undefined) processed = edit.Remove
    if (edit.Modify !== undefined) processed = edit.Modify
    store.dispatch(addCurrent(processed))
    editManager.applyEdit(processed)
  })
}
