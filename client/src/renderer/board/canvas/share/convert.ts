import { Edit } from "../../../lib/EditManager";
import { Edit as EditMsg } from '../../../lib/BoardManager/typing'
import { Add, Modify, Remove } from "../../../lib/protocol/protocol";


export function convertToEdits(enums: EditMsg[]): Edit[] {
  return enums.map(e => {
    let edit = e.edit;
    let processed = null;
    if (edit.Add !== undefined) processed = edit.Add
    if (edit.Remove !== undefined) processed = edit.Remove
    if (edit.Modify !== undefined) processed = edit.Modify

    return processed
  })
}

export function convertToStrings(edits: Edit[]): String[] {
  return edits.map(e => JSON.stringify(e))
}


export function convertToEnum(edit: Edit): EditMsg {
  const keys = Object.keys(edit)
  if (keys.includes('shape')) return { edit: { Add: edit as Add } }
  if (keys.includes('shapes')) return { edit: { Remove: edit as Remove } }
  if (keys.includes('current')) return { edit: { Modify: edit as Modify } }
}
