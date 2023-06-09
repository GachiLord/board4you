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


interface IInsertProps{
    data: ClipboardEvent|string|IImage, 
    editManager: EditManager, 
    pos?: ICoor,
    maxSize?: ISize
}

export default async function(insertProps: IInsertProps){
    const stage = store.getState().stage
    const maxSize = insertProps.maxSize ? insertProps.maxSize: {height: stage.baseHeight, width: stage.width}
    const data = insertProps.data
    const editManager = insertProps.editManager

    let img: IImage = null
    if (data instanceof ClipboardEvent){
        img = await paste(data)
    }
    else if (typeof data === 'string'){
        img = { url: data, size: await ImageUtils.getSizeOfBase64Img(data) }
    }
    else img = data

    if (!img) return

    let pos = insertProps.pos
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
        height: Math.min(img.size.height, maxSize.height),
        width: Math.min(img.size.width, maxSize.width),
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