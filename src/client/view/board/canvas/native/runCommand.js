import store from '../../../store/store';
import { addCurrent } from '../../../features/history';
import { emptySelection } from '../../../features/select';
import EditManager from '../../../../lib/EditManager';
import paste from './paste';
import { v4 as uuid4 } from 'uuid';
import writeToClipboard from './writeToClipboard';
import Selection from '../../../../lib/Selection';
import boardEvents from '../../../base/boardEvents';
import { setStagePos } from '../../../features/stage';
import layerToUrls from '../image/layerToUrls'
import renderAll from '../image/renderAll';
import renderVisible from '../image/renderVisible';
import ImageUtils from '../../../../lib/ImageUtils'
import { run } from '../../../../lib/twiks';
import clearCanvas from '../image/clearCanvas';
import insertImage from '../image/insertImage';
import openFile from './openFile';



export default async function(stage, o, data){
    console.log(o)
    const canvas = stage.children[0]
    const temporaryLayer = stage.children[1]
    const editManager = new EditManager(canvas)

    if (o === 'newFile'){
        run( api => {
            api.hadleNewFile()
        } )
        clearCanvas(canvas, temporaryLayer)
        // update stagePos
        store.dispatch(setStagePos({x: 0, y: 0}))
        stage.position({x: 0, y: 0})
    }
    if (o === 'selectSize'){
        boardEvents.emit('selectSize')
    }
    if (o === 'openFile'){
        openFile(data, canvas, temporaryLayer, editManager)
    }   
    if (o === 'saveFile'){
        renderAll(canvas)
        // save by browser if there is no nodejs env
        run( (api) => {
                api.saveFile(layerToUrls(canvas, temporaryLayer))
            }, 
            async () => {
                const pdf = await ImageUtils.base64imgsToPdfObject(layerToUrls(canvas, temporaryLayer))
                pdf.save('lesson')
            }
        )
        renderVisible(canvas)
    }
    if (o === 'saveFileAs'){
        renderAll(canvas)
        // save by browser if there is no nodejs 
        run( (api) => {
                api.saveFileAs(layerToUrls(canvas, temporaryLayer))
            }, 
            async () => {
                const pdf = await ImageUtils.base64imgsToPdfObject(layerToUrls(canvas, temporaryLayer))
                pdf.save('lesson')
            }
        )
        renderVisible(canvas)
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
        insertImage(data, editManager)
    }
    if (o === 'copy' || o === 'cut'){
        const transformer = canvas.find('Transformer')[0]
        if (transformer){
            writeToClipboard(transformer, o === 'cut')
        }
    }
}