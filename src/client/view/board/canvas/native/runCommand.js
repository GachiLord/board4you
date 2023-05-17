import setCanvasSize from '../../../../model/setCanvasSize';
import { flushSync } from 'react-dom';
import { run } from '../../../../lib/twiks';

export default async function(o, data){
    console.log(o)
    switch (o) {
        case 'newFile':
            flushSync( () => { this.setState(this.getBaseState()) } )
            run( () => {
                this.electronAPI.hadleNewFile()
            } )
            break
        case 'selectSize':
            boardEvents.emit('selectSize')
            this.setState({baseHeight: this.getBaseState().height, width: this.getBaseState().width})
            break
        case 'openFile':   
            try{
                const files = data.base64
                const type = data.type
                const path = data.path
                if (files.length > 0) {
                    flushSync( () => this.setState(this.getBaseState()))

                    switch(type){
                        case 'pdf':
                            const pdf = await CanvasUtils.getPdfAsBase64imgs(path)
                            const imgs = pdf.imgs

                            this.setState({baseHeight: pdf.size.height, width: pdf.size.width})
                            setCanvasSize(pdf.size)
                            
                            for (let img of imgs){
                                this.paste(img, await CanvasUtils.getSizeOfBase64Img(img), 0 )
                            }
                            break
                        case 'png':
                            const size = await CanvasUtils.getSizeOfBase64Img(files[0])
                            this.setState({baseHeight: size.height, width: size.width})
                            setCanvasSize(size)

                            for(let img of files){
                                this.paste(img, await CanvasUtils.getSizeOfBase64Img(img), 0 )
                            }
                            break
                    }

                    run( () => {
                        this.electronAPI.handleFileOpen()
                    } )
                    // set pos to last page
                    const stagePos = this.state.stagePos
                    stagePos.y = -CanvasUtils.getFreeY(this.getCurrentHistoryAcActions()) + this.state.baseHeight
                    this.setState({ stagePos: stagePos })
                    boardEvents.emit('stageDragStoped', this.state.stagePos, this.state.height)
                }
                
            }
            catch{
            }
            break
        case 'saveFile':
            // save by browser if there is no nodejs env
            run( async () => {
                    this.electronAPI.saveFile(await this.getStageAsUrls())
                }, 
                async () => {
                    await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
                }
            )
            break;
        case 'saveFileAs':
            // save by browser if there is no nodejs 
            run( async () => {
                    this.electronAPI.saveFileAs(await this.getStageAsUrls())
                }, 
                async () => {
                    await CanvasUtils.getBase64imgsAsPdf(this.getStageAsUrls()).save('lesson')
                }
            )
            break;
        case 'undo':
            this.handleUndo()
            this.removeSelectRect()
            break
        case 'redo':             
            this.handleRedo()
            this.removeSelectRect()
            break
        case 'del':
            if (this.state.selection.length > 0) this.addAction({action:'remove', shapes: this.state.selection})
            this.removeSelectRect()
            break
    }
}