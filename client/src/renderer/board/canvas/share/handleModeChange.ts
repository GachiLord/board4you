import BoardManager from "../../../lib/BoardManager/BoardManager"
import store from "../../../store/store"

interface Params {
  setLoading: (s: boolean) => void,
  setError: (s: boolean) => void,
  setRoomExists: (s: boolean) => void,
  boardManager: BoardManager,
  roomId: string
}

export default function handleModeChange({ setLoading, setError, setRoomExists, boardManager, roomId }: Params) {
  const mode = store.getState().board.mode
  if (mode !== 'local' && !boardManager.status.connected && roomId) {
    setLoading(true)
    boardManager.connect()
      .catch(() => setError(true))
  }
}
