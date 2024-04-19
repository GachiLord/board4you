import Konva from "konva"
import EditManager from "../../lib/EditManager"
import BoardManager from "../../lib/BoardManager/BoardManager"
import store from "../../store/store"
import { setMode } from "../../features/board"
import joinRoom from "./share/joinRoom"
import handleMessage from "./share/handleMessage"
import handleBoardEvents from "./native/handleBoardEvents"
import handleWebEvents from "./native/handleWebEvents"
import HandleNativeEvents from "./native/handleNativeEvents"
import getPrivateId from "./share/getPrivateId"
import { Mode } from "original-fs"

interface Editor {
  stage: Konva.Stage,
  boardManager: BoardManager
  mode: Mode
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
  // share info
  const privateId = getPrivateId(roomId)
  const coEditor = privateId ? privateId.includes('_co_editor') : false
  // join room if mode is shared
  if (roomId) {
    setLoading(true)
    joinRoom({
      navigate,
      setLoading,
      setRoomExists,
      boardManager,
      roomId,
      inviteId
    })

    // check mode 
    if (privateId && !coEditor) store.dispatch(setMode('author'))
    else if (coEditor || inviteId) store.dispatch(setMode('coop'))
    else store.dispatch(setMode('viewer'))
  }
  // set listener for msgs
  boardManager.handlers.onMessage = (msg: string) => handleMessage(msg, {
    boardManager,
    editManager,
    setError,
    setLoading,
    setRoomExists
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
