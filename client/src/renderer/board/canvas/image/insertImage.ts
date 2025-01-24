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
import { ShapeType, Tool } from "../../../lib/protocol/protocol"
import { LineType } from "../../../lib/protocol/protocol_bg"


interface IInsertProps {
  data: ClipboardEvent | string | IImage,
  editManager: EditManager,
  pos?: ICoor,
  maxSize?: ISize,
  skipImgLengthValidation?: boolean
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
  // if img is empty or is too lagre(and we want to validate that), stop the function
  if (!img || (!insertProps.skipImgLengthValidation && img.url.length > 65_534)) {
    if (img) console.warn(`Passing too large image(${img.url.length})`)
    return
  }

  let pos = insertProps.pos
  if (!pos) {
    pos = { ...stage.stagePos }
    pos.y = Math.abs(pos.y)
  }

  const shape: IShape = {
    tool: Tool.ImgTool,
    shape_type: ShapeType.Img,
    x: pos.x,
    y: pos.y,
    url: img.url,
    color: "",
    line_size: 0,
    line_type: LineType.General,
    radius_x: 0,
    radius_y: 0,
    rotation: 0,
    scale_x: 1,
    scale_y: 1,
    skew_x: 0,
    skew_y: 0,
    points: [],
    height: Math.min(img.size.height, maxSize.height),
    width: Math.min(img.size.width, maxSize.width),
    shape_id: uuid4(),
    connected: []
  }
  const edit: unknown = {
    id: uuid4(),
    edit_type: 'add',
    shape: shape,
  }

  editManager.applyEdit(edit as Edit)
  if (itemIn(mode, 'coop', 'author')) boardManager.send('Push', { data: [convertToEnum(edit as Edit)], silent: false })
  store.dispatch(addCurrent(edit as Edit))
}
