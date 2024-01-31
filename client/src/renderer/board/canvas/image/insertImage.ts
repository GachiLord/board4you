import store from "../../../store/store"
import { addCurrent } from "../../../features/history"
import paste from "../native/paste"
import { v4 as uuid4 } from 'uuid'
import ImageUtils from "../../../lib/ImageUtils"
import { ICoor } from "../../../base/typing/ICoor"
import EditManager, { Edit } from "../../../lib/EditManager"
import IImage from "./IImage"
import IShape from "../../../base/typing/IShape"
import ISize from "../../../base/typing/ISize"
import BoardManager from "../../../lib/BoardManager/BoardManager"
import { convertToEnum } from "../share/convert"
import { itemIn } from "../../../lib/twiks"


interface IInsertProps {
  data: ClipboardEvent | string | IImage,
  editManager: EditManager,
  pos?: ICoor,
  maxSize?: ISize
}

export default async function(boardManager: BoardManager, insertProps: IInsertProps) {
  const state = store.getState()
  const stage = state.stage
  const mode = state.board.mode
  const maxSize = insertProps.maxSize ? insertProps.maxSize : { height: stage.baseHeight, width: stage.width }
  const data = insertProps.data
  const editManager = insertProps.editManager

  let img: IImage = null
  if (data instanceof ClipboardEvent) {
    img = await paste(data)
  }
  else if (typeof data === 'string') {
    img = { url: data, size: await ImageUtils.getSizeOfBase64Img(data) }
  }
  else img = data

  if (!img || img.url.length > 50000) return

  let pos = insertProps.pos
  if (!pos) {
    pos = { ...stage.stagePos }
    pos.y = Math.abs(pos.y)
  }

  const shape: IShape = {
    tool: 'img',
    shape_type: 'img',
    x: pos.x,
    y: pos.y,
    url: img.url,
    height: Math.min(img.size.height, maxSize.height),
    width: Math.min(img.size.width, maxSize.width),
    shape_id: uuid4(),
    connected: []
  }
  const edit: Edit = {
    id: uuid4(),
    edit_type: 'add',
    shape: shape
  }

  editManager.applyEdit(edit)
  if (itemIn(mode, 'coop', 'author')) boardManager.send('Push', { ...boardManager.getCredentials(), data: [convertToEnum(edit)], silent: false })
  store.dispatch(addCurrent(edit))
}
