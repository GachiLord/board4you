import EditManager from "../../../lib/EditManager";
import { convertToEdits } from "./convert";

export default function handlePush(editManager: EditManager, data: string[]){
    convertToEdits(data).forEach( edit => {
        editManager.applyEdit(edit);
    } )
}