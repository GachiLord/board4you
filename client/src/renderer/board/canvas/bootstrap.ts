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

interface Editor{
    stage: Konva.Stage,
    boardManager: BoardManager
    mode: 'shared'|'local'
    roomId: string
    setLoading: (s: boolean) => void
    setRoomExists: (s: boolean) => void
    setError: (s: boolean) => void
    navigate: (l: string) => void
    cleanUp: () => void
}

export default function bootstrap({ stage, boardManager, mode, roomId, setLoading, setRoomExists, setError, navigate, cleanUp }: Editor){
    // create canvas and editManager
    const canvas: Konva.Layer = stage.children[0]
    const editManager = new EditManager(canvas, boardManager)
    // update mode to run useEffect`s callback again
    if (roomId) store.dispatch(setMode('shared'))
    // join room if mode is shared
    if (mode === 'shared') joinRoom({
        setLoading,
        setRoomExists,
        boardManager,
        roomId
    })
    // set listener for msgs
    boardManager.handlers.onMessage = (msg: string) => handleMessage(msg, {
        editManager,
        setError,
        setLoading
    })
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
        boardEventsSubs.forEach( s => s.remove() )
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