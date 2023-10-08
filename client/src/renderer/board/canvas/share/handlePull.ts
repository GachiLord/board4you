import { addCurrent, removeCurrent, removeUndone } from "../../../features/history";
import EditManager from "../../../lib/EditManager";
import store from "../../../store/store";
import { convertToEdits } from "./convert";


interface editData{
    should_be_created_edits: string[],
    should_be_deleted_ids: string[]
}
interface pushData{
    current: editData,
    undone: editData
}

export default function handlePush(editManager: EditManager, data: pushData){
    // add missing edits
    convertToEdits(data.current.should_be_created_edits).forEach( edit => {
        store.dispatch(addCurrent(edit))
        editManager.applyEdit(edit)
    } )
    convertToEdits(data.undone.should_be_created_edits).forEach( edit => {
        store.dispatch(addCurrent(edit))
        editManager.applyEdit(edit)
    } )
    // delete extra edits
    data.current.should_be_deleted_ids.forEach( id => {
        const edit = store.getState().history.current.findLast( e => e.id === id )
        store.dispatch(removeCurrent(id))
        editManager.cancelEdit(edit)
    } )
    data.undone.should_be_deleted_ids.forEach( id => {
        const edit = store.getState().history.undone.findLast( e => e.id === id )
        store.dispatch(removeUndone(id))
        editManager.cancelEdit(edit)
    } )
}