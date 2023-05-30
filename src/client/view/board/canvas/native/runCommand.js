import store from '../../../store/store';
import { addCurrent } from '../../../features/history';
import { emptySelection } from '../../../features/select';
import EditManager from '../../../../lib/EditManager';
import paste from './paste';
import { v4 as uuid4 } from 'uuid';
import writeToClipboard from './writeToClipboard';
import Selection from '../../../../lib/Selection';



export default async function(canvas, o, data){
    console.log(o)
    const editManager = new EditManager(canvas)

    if (o === 'newFile'){

    }
    if (o === 'selectSize'){

    }
    if (o === 'openFile'){

    }   
    if (o === 'saveFile'){
        // save by browser if there is no nodejs env
        // run( async () => {
        //         this.electronAPI.saveFile(await this.getStageAsUrls())
        //     }, 
        //     async () => {
        //         await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
        //     }
        // )
    }
    if (o === 'saveFileAs'){
        // save by browser if there is no nodejs 
        // run( async () => {
        //         this.electronAPI.saveFileAs(await this.getStageAsUrls())
        //     }, 
        //     async () => {
        //         await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
        //     }
        // )
    }
    if (o === 'undo'){
        Selection.destroy(canvas)
        editManager.undo()
    }
    if (o === 'redo'){
        Selection.destroy(canvas)
        editManager.redo()
    }             
    if (o === 'del'){
        const selection = store.getState().select.selection
        if (selection.length !== 0){
            const edit = {
                type: 'remove',
                shapes: selection
            }
            editManager.applyEdit(edit)
            store.dispatch(addCurrent(edit))
            store.dispatch(emptySelection())
            Selection.destroy(canvas)
        }
    }
    if (o === 'paste'){
        const img = await paste(data)
        if (!img) return

        const pos = store.getState().stage.stagePos
        const shape = {
            tool: 'img',
            x: pos.x,
            y: Math.abs(pos.y),
            url: img.url,
            height: img.size.height,
            width: img.size.width,
            shapeId: uuid4()
        }
        const edit = {
            type: 'add',
            shape: shape
        }

        editManager.applyEdit(edit)
        store.dispatch(addCurrent(edit))
    }
    if (o === 'copy' || o === 'cut'){
        const transformer = canvas.find('Transformer')[0]
        if (transformer){
            writeToClipboard(transformer, o === 'cut')
        }
    }
}