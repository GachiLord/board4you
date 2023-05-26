import { run, removeTransformers } from '../../../../lib/twiks';
import store from '../../../store/store';
import { addCurrent } from '../../../features/history';
import { emptySelection } from '../../../features/select';
import EditManager from '../../../../lib/EditManager';


export default async function(canvas, o, data){
    console.log(o)
    const editManager = new EditManager(canvas)

    switch (o) {
        case 'newFile':
            break
        case 'selectSize':
            break
        case 'openFile':   
            
            break
        case 'saveFile':
            // save by browser if there is no nodejs env
            // run( async () => {
            //         this.electronAPI.saveFile(await this.getStageAsUrls())
            //     }, 
            //     async () => {
            //         await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
            //     }
            // )
            // break;
        case 'saveFileAs':
            // save by browser if there is no nodejs 
            // run( async () => {
            //         this.electronAPI.saveFileAs(await this.getStageAsUrls())
            //     }, 
            //     async () => {
            //         await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
            //     }
            // )
            break;
        case 'undo':
            removeTransformers(canvas)
            editManager.undo()
            break
        case 'redo':             
            removeTransformers(canvas)
            editManager.redo()
            break
        case 'del':
            const selection = store.getState().select.selection
            if (selection.length !== 0) {
                const edit = {
                    type: 'remove',
                    shapes: selection
                }
                editManager.applyEdit(edit)
                store.dispatch(addCurrent(edit))
                store.dispatch(emptySelection())
                removeTransformers(canvas)
            }
            break
    }
}