export default function(e){
    const tool = this.props.tool
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();


    if (['pen', 'eraser'].includes(tool)){
        if (!this.state.isDrawing) return;

        let shapes = this.state.currentHistory
        let lastLine = shapes.at(-1);
        // add point
        lastLine.points = lastLine.points.concat([point.x,
                                                  point.y]);
        // replace last
        shapes.splice(shapes.length - 1, 1, lastLine);
        this.setState({currentHistory: shapes.concat()});
    }
    else if (['arrow', 'line'].includes(tool)){
        if (!this.state.isDrawing) return;

        let shapes = this.state.currentHistory
        let lastLine = shapes.at(-1)

        if (lastLine.points.length > 2) lastLine.points = lastLine.points.slice(0,2)
        lastLine.points = lastLine.points.concat([point.x, point.y])
            
        this.setState({currentHistory: [...shapes.slice(0,-1), lastLine]})
    }
    else if (['rect', 'ellipse'].includes(tool)){
        if (!this.state.isDrawing) return;

        let shapes = this.state.currentHistory
        let rect = shapes.at(-1)
        rect.width = point.x - rect.pos.x
        rect.height = point.y - rect.pos.y

        this.setState({currentHistory: shapes})
    }
    else if (tool === 'select'){
        if (!this.state.isDrawing) return;

        let selectRect = this.state.temporaryShapes.selectRect
        selectRect.width = point.x - selectRect.x
        selectRect.height = point.y - selectRect.y
            
        this.setState( state => {
            return {
                temporaryShapes: {...state.temporaryShapes, selectRect: selectRect},
                selection: []
            }
        })
    }
    else if (tool === 'move'){
        if (!this.state.isDraggingStage) return

        const lastPos = this.state.stagePos
        const lastPointerPos = this.state.lastPointerPos
        let newPos = {x: 0,y: 0}

        newPos.y += lastPos.y + (point.y - lastPointerPos.y)
        newPos.x += 0
        if (newPos.y >= 0) newPos.y = 0
            
        this.setState({stagePos: newPos})

        if ( (Math.abs(newPos.y) - this.state.height) >= 0 ) this.increaseHeight()
    }
}