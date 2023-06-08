import store from "../../../store/store"
import { addCurrent } from "../../../features/history"
import paste from "../native/paste"
import { v4 as uuid4 } from 'uuid'
import ImageUtils from "../../../lib/ImageUtils"
import { ICoor } from "../../../base/typing/ICoor"
import EditManager, { Edit } from "../../../lib/EditManager"
import IImage from "./IImage"
import IShape from "../../../base/typing/IShape"



export default async function(data: ClipboardEvent|string|IImage, editManager: EditManager, pos: ICoor|undefined = undefined){
    const stage = store.getState().stage
    let img: IImage = null
    if (data instanceof ClipboardEvent){
        img = await paste(data)
    }
    else if (typeof data === 'string'){
        img = { url: data, size: await ImageUtils.getSizeOfBase64Img(data) }
    }
    else img = data

    if (!img) return

    if (!pos){
        pos = {...stage.stagePos}
        pos.y = Math.abs(pos.y)
    }

    const shape: IShape = {
        tool: 'img',
        type: 'img',
        x: pos.x,
        y: pos.y,
        url: img.url,
        height: Math.min(img.size.height, stage.baseHeight),
        width: Math.min(img.size.width, stage.width),
        shapeId: uuid4(),
        connected: []
    }
    const edit: Edit = {
        type: 'add',
        shape: shape
    }

    editManager.applyEdit(edit)
    store.dispatch(addCurrent(edit))    
}