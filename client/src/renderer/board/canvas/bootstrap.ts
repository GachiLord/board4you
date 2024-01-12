import Konva from "konva"
import EditManager from "../../lib/EditManager"
import BoardManager from "../../lib/BoardManager/BoardManager"
import store from "../../store/store"
import { setInviteId, setMode } from "../../features/board"
import joinRoom from "./share/joinRoom"
import handleMessage from "./share/handleMessage"
import handleBoardEvents from "./native/handleBoardEvents"
import handleWebEvents from "./native/handleWebEvents"
import HandleNativeEvents from "./native/handleNativeEvents"
import isCoEditor from "./share/isCoEditor"
import { deleteRoom, setRoom } from "../../features/rooms"
import isAuthor from "./share/isAuthor"
import { doRequest } from "../../lib/twiks"
import getPrivateId from "./share/getPrivateId"
import { set } from "../../features/tool"

interface Editor {
  stage: Konva.Stage,
  boardManager: BoardManager
  mode: 'shared' | 'local'
  roomId: string
  inviteId: string
  setLoading: (s: boolean) => void
  setRoomExists: (s: boolean) => void
  setError: (s: boolean) => void
  navigate: (l: string) => void
  cleanUp: () => void
}

export default function bootstrap({
  stage,
  boardManager,
  mode,
  roomId,
  inviteId,
  setLoading,
  setRoomExists,
  setError,
  navigate,
  cleanUp
}: Editor) {
  // create canvas and editManager
  const canvas: Konva.Layer = stage.children[0]
  const editManager = new EditManager(canvas, boardManager)
  // update mode to run useEffect`s callback again
  if (roomId) store.dispatch(setMode('shared'))
  // join room if mode is shared
  if (mode === 'shared') {
    setLoading(true)
    boardManager.connect()
  }
  const coEditor = isCoEditor(roomId)
  const privateId = getPrivateId(roomId)
  // if there is a inviteId and user is author, redirect to pretty link
  if (privateId && !coEditor && inviteId) navigate(`/board/${roomId}`)
  // set inviteId if user is author
  if (privateId && !coEditor) {
    doRequest('room/co-editor/read', { public_id: roomId, private_id: privateId }, 'POST')
      .then((r) => {
        store.dispatch(setInviteId(r.co_editor_private_id))
      })
      .catch(() => {
        setError(true)
      })
  }
  // add coop private id if user is not author
  if (inviteId && (coEditor || !privateId)) {
    // check if inviteId is valid
    doRequest('room/co-editor/check', { public_id: roomId, co_editor_private_id: inviteId }, 'POST')
      .then((r) => {
        if (r.valid) {
          // add privateId and change tool
          store.dispatch(setRoom({ publicId: roomId, privateId: inviteId }))
          store.dispatch(set('pen'))
          // navigate to pretty link because there is no need for inviteId anymore
          navigate(`/board/${roomId}`)
        }
        else {
          store.dispatch(deleteRoom(roomId))
          store.dispatch(set('move'))
        }
      })
      .catch(() => {
        setRoomExists(false)
      })
      .finally(() => {
        // navigate to simple link because there is no need for inviteId anymore
        navigate(`/board/${roomId}`)
      })
  }
  // set listener for msgs
  boardManager.handlers.onMessage = (msg: string) => handleMessage(msg, {
    boardManager,
    editManager,
    setError,
    setLoading,
    setRoomExists
  })
  boardManager.handlers.onOpen = () => joinRoom({
    setLoading,
    setRoomExists,
    boardManager,
    roomId
  })
  boardManager.handlers.onClose = () => setLoading(true)
  boardManager.handlers.retry = () => setLoading(true)
  boardManager.handlers.reconnect = () => setLoading(false)
  // handle errors
  boardManager.handlers.onError = () => setRoomExists(false)
  // listen for board events
  const boardEventsSubs = handleBoardEvents({
    setLoading,
    navigate,
    editManager,
    stage
  })
  // web event listeners
  const removeWebSubs = handleWebEvents({
    stage,
    boardManager
  })
  // listen for keyboard and main process events
  const nativeEventsSub = HandleNativeEvents({ stage, boardManager })
  // handle unmount
  return () => {
    // boardevents
    boardEventsSubs.forEach(s => s.remove())
    // keybindings
    nativeEventsSub()
    // web events
    removeWebSubs()
    // clean component state
    cleanUp()
    // disconnect
    boardManager.disconnect()
  }
}
