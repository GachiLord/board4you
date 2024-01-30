import { setMode, setRoomId, setShareInfo } from "../../../features/board"
import { deleteRoom, setRoom } from "../../../features/rooms"
import { set } from "../../../features/tool"
import BoardManager from "../../../lib/BoardManager/BoardManager"
import { request } from "../../../lib/request"
import store from "../../../store/store"
import getPrivateId from "./getPrivateId"
import pull from "./pull"

interface Props {
  navigate: (to: string) => void
  setLoading: (s: boolean) => void
  setRoomExists: (s: boolean) => void
  boardManager: BoardManager
  roomId: string
  inviteId?: string
}

export default function joinRoom({ navigate, setLoading, setRoomExists, boardManager, roomId, inviteId }: Props) {
  setLoading(true)
  if (roomId) boardManager.joinRoom(roomId)
    .then(() => {
      // fetch room contents
      pull(boardManager)
      setRoomExists(true)
      // update board state according to mode
      const mode = store.getState().board.mode
      const privateId = getPrivateId(roomId)
      if (mode === 'author') {
        request('room/co-editor/read').post().body({ public_id: roomId, private_id: privateId })
          .then((r) => {
            store.dispatch(setShareInfo({
              privateId,
              roomId,
              inviteId: r.co_editor_private_id
            }))
          })
          .catch(() => {
            setRoomExists(false)
          })
          .finally(() => {
            if (inviteId) navigate(`/board/${roomId}`)
          })
      }
      if (mode === 'coop') {
        // check if inviteId is valid
        const idToCheck = inviteId ? inviteId : privateId
        request('room/co-editor/check').post().body({ public_id: roomId, co_editor_private_id: idToCheck })
          .then((r) => {
            if (r.valid) {
              // add privateId and change tool
              store.dispatch(setRoom({ publicId: roomId, privateId: idToCheck }))
              store.dispatch(set('pen'))
              // set share info
              store.dispatch(setRoomId(roomId))
            }
            else {
              // if inviteId is invalid set mode to viewer
              store.dispatch(deleteRoom(roomId))
              store.dispatch(set('move'))
              store.dispatch(setMode('viewer'))
            }
          })
          .catch(() => {
            setRoomExists(false)
          })
          .finally(() => {
            if (inviteId) navigate(`/board/${roomId}`)
          })
      }
      if (mode === 'viewer') {
        store.dispatch(setShareInfo({}))
        store.dispatch(set('move'))
      }

    })
    // alert if there is no such room 
    .catch((e) => {
      console.error(e)
      setLoading(false)
      setRoomExists(false)
    })
}
