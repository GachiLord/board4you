import { flushSync } from "react-dom"

export default function(){
    const state = this.state

    if (state.selection.length > 0) {
        flushSync( () => {
            this.handleDrawAfterUndo()
        } )

        this.setState({isDraggingSelection: true})
        
        const selectRect = {...state.temporaryShapes.selectRect}
        this.addAction({
            action: 'move',
            shapes: state.selection,
            oldPos: {
                        x: selectRect.x + state.stagePos.x,
                        y: selectRect.y + state.stagePos.y
                    },
            newPos: 
                    {
                        x: selectRect.x + state.stagePos.x,
                        y: selectRect.y + state.stagePos.y
                    },
        })
    }
}