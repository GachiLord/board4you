import { Edit } from "../../../lib/EditManager";


export function convertToEdits(strings: string[]): Edit[]{
    return strings.map( s => JSON.parse(s) )
}

export function convertToStrings(edits: Edit[]) {
    return edits.map( e => JSON.stringify(e) )
}