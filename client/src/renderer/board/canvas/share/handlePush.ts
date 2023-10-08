import { addCurrent } from "../../../features/history"
import EditManager from "../../../lib/EditManager"
import store from "../../../store/store"
import { convertToEdits } from "./convert"

export default function handlePush(editManager: EditManager, data: string[]){
    convertToEdits(data).forEach( edit => {
        store.dispatch(addCurrent(edit))
        editManager.applyEdit(edit)
    } )
}