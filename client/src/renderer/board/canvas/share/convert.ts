import { Edit } from "../../../lib/EditManager";


export type EditEnum = { [key: string]: Edit }

export function convertToEdits(enums: EditEnum[]): Edit[] {
  return enums.map(e => {
    const key = Object.keys(e)[0]
    return e[key]
  })
}

export function convertToStrings(edits: Edit[]): String[] {
  return edits.map(e => JSON.stringify(e))
}

export function convertToEnum(edit: Edit): EditEnum {
  switch (edit.edit_type) {
    case 'add': {
      return { Add: edit }
    }
    case 'remove': {
      return { Remove: edit }
    }
    case 'modify': {
      return { Modify: edit }
    }
  }
}
