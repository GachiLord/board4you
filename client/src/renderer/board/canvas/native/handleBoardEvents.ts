import boardEvents from "../../../base/constants/boardEvents"
import { setRoom } from "../../../features/rooms"
import BoardManager from "../../../lib/BoardManager/BoardManager"
import EditManager from "../../../lib/EditManager"
import store from "../../../store/store"
import Selection from "../../../lib/Selection"
import { run } from "../../../lib/twiks"
import Konva from "konva"
import renderVisible from "../image/renderVisible"
import { sizeChange } from "../mouse"
import { ICoor } from "../../../base/typing/ICoor"


interface props {
  setLoading: (s: boolean) => void,
  navigate: (l: string) => void,
  editManager: EditManager,
  stage: Konva.Stage
}

export default function handleBoardEvents({ setLoading, navigate, editManager, stage }: props) {
  const canvas = editManager.layer
  const onRoomCreatedSub = boardEvents.addListener('roomCreated', () => {
    const state = store.getState()
    const history = { current: state.history.current, undone: state.history.undone }
    const size = { height: state.stage.baseHeight, width: state.stage.width }
    const title = state.board.title
    setLoading(true)
    BoardManager.createRoom(history, size, title).then(roomInfo => {
      // save privateId to continue editing after reload
      store.dispatch(setRoom({ publicId: roomInfo.public_id, privateId: roomInfo.private_id }))
      navigate(`/board/${roomInfo.public_id}`)
    })
  })
  const undoSub = boardEvents.addListener('undo', () => {
    Selection.destroy(canvas)
    editManager.undo()

    run(api => api.handleFileChange())
  })
  const redoSub = boardEvents.addListener('redo', () => {
    Selection.destroy(canvas)
    editManager.redo()

    run(api => api.handleFileChange())
  })
  const pageSettedSub = boardEvents.addListener('pageSetted', (pos: ICoor) => {
    stage.position(pos)
    renderVisible(canvas)
  })
  const sizeHasChangedSub = boardEvents.addListener('sizeHasChanged', (size: undefined | { width: number, height: number, baseHeight: number }) => {
    const linesLayer = stage.children[2]
    sizeChange(linesLayer, size)
  })


  return [onRoomCreatedSub, undoSub, redoSub, pageSettedSub, sizeHasChangedSub]
}
