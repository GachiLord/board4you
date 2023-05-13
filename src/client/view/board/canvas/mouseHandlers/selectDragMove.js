export default function(e){
    if (!this.state.isDraggingSelection) return

    this.setState( (state) => { 
        //const relativePos = e.target.getRelativePointerPosition()
        const pos = e.target._lastPos
        let actions = state.historyActions
        let temporaryShapes = state.temporaryShapes

        temporaryShapes.selectRect.x = pos.x + Math.abs(this.state.stagePos.x)
        temporaryShapes.selectRect.y = pos.y + Math.abs(this.state.stagePos.y)

        actions.at(-1).newPos = pos

        return {historyActions: actions,
                temporaryShapes: temporaryShapes
        }
    })    
}