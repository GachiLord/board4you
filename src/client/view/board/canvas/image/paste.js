import { flushSync } from "react-dom"

export default function(url, size, delta = 20){
    const canvasSize = getCanvasSize()
    let scale = Math.min((canvasSize.width / size.width), (canvasSize.height / size.height))        
    if (scale >= 1) scale = 1
    const height = size.height * scale
    const width = size.width * scale
    const x = 0
    const y = CanvasUtils.getLastY(this.getCurrentHistoryAcActions()) + delta

   
    flushSync( () => {
        this.acceptCurrentHistoryChanges()
        this.setState( state => {
            return {
                currentHistory: [
                    ...state.currentHistory,
                    {
                    type: 'img',
                    pos: {
                    x: x,
                    y: y,
                    },
                    url: url,
                    height: height,
                    width: width,
                    shapeId: this.state.currentHistory.length
                    }
                ]
                }
            } )
        this.addAction()
    } )

        if (y + height > canvasSize.height) this.increaseHeight( Math.round(scale) )
        
        this.removeSelectRect()    
}