import boardEvents from "../../../base/boardEvents"
import CanvasUtils from "../../../../lib/CanvasUtils"


export default function(e){
    boardEvents.emit('stageDragStoped', this.state.stagePos, this.state.height)
    // stop drawing if we are not on canvas
    // stop drawing    
    const isDrawing = this.state.isDrawing
    const tool = this.props.tool
    const stage = e.target.getStage()


    if ('pen'=== tool && e.type !== 'mouseleave') {
        let shapes = this.state.currentHistory
        let lastEl = shapes.at(-1)
        let points = lastEl.points
        
        if (points.length === 2) {
            shapes.at(-1).points = points.concat([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
            this.setState({currentHistory: shapes})
        }
    }
    else if (tool === 'select'){
        if (!isDrawing) return

        
        let shapes = stage.getChildren()[0].children
        let box = this.state.temporaryShapes.selectRect

        // offset negative wifth and height
        if (box.width < 0) {
            box.x += box.width
            box.width = Math.abs(box.width)
        }
        if (box.height < 0){
            box.y += box.height
            box.height = Math.abs(box.height)
        }

        let selected = shapes.filter((shape) =>
            {
                const shapeType = shape.attrs.tool
                if (shapeType === 'line' || shapeType === 'arrow' || shapeType === 'pen'){
                    if (CanvasUtils.hasInterceptionWithLine(box, shape)) return shape
                }
                else{
                    if (Konva.Util.haveIntersection(box, CanvasUtils.getClientRect(shape))) return shape
                }
                // if (Konva.Util.haveIntersection(box, CanvasUtils.getClientRect(shape))) return shape
            }
        );
        this.setState({selection: selected})
        if (selected.length === 0) this.setState(state => {
            return {
                temporaryShapes: {
                    ...state.temporaryShapes,
                    selectRect: []
                }
            }
        })
    }
    else if (tool === 'move') this.setState({isDraggingStage: false})

    this.setState({
        isDrawing: false
    })
}