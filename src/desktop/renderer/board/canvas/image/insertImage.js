import store from "../../../store/store"
import { addCurrent } from "../../../features/history"
import paste from "../native/paste"
import { v4 as uuid4 } from 'uuid'
import ImageUtils from "../../../lib/ImageUtils"


export default async function(data, editManager, pos){
    const stage = store.getState().stage
    const img = typeof data === 'string' ? { url: data, size: await ImageUtils.getSizeOfBase64Img(data) }: await paste(data)
    if (!img) return

    if (!pos){
        pos = {...stage.stagePos}
        pos.y = Math.abs(pos.y)
    }

    const shape = {
        tool: 'img',
        type: 'img',
        x: pos.x,
        y: pos.y,
        url: img.url,
        height: Math.min(img.size.height, stage.baseHeight),
        width: Math.min(img.size.width, stage.width),
        shapeId: uuid4()
    }
    const edit = {
        type: 'add',
        shape: shape
    }

    editManager.applyEdit(edit)
    store.dispatch(addCurrent(edit))    
}