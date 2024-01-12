import store from "../../../store/store"

export default function isCoEditor(roomId?: string) {
  const privateId = store.getState().rooms[roomId]
  return privateId != undefined && privateId.includes('_co_editor')
}
