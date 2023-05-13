import { flushSync } from "react-dom";

export default function(e){
    const tool = this.props.tool
    const color = this.props.color
    const pos = e.target.getStage().getRelativePointerPosition()
    const lineSize = this.props.lineSize
    const lineType = this.props.lineType

    // del select if drawing and
    if (tool !== 'select') this.setState({temporaryShapes: {}})

    if (['pen', 'eraser', 'line', 'arrow', 'dashed line'].includes(tool)){ 
        //this.setCursor('crosshair')
        this.setState({isDrawing: true})

        flushSync( () => {
            this.handleDrawAfterUndo() 
        } )
        
        const type = ['pen', 'eraser', 'dashed line'].includes(tool) ? 'line': tool

        this.setState({
            currentHistory: [...this.state.currentHistory,
            {   tool: tool,
                points: [pos.x, pos.y],
                type: type, 
                color: color,
                shapeId: this.state.currentHistory.length,
                pos: {x: 0, y: 0},
                lineSize: lineSize,
                lineType: lineType
            }]
        })

        this.addAction()
    }
    else if ( ['rect', 'ellipse'].includes(tool) ){
        this.setState({isDrawing: true})

        flushSync( () => {
            this.handleDrawAfterUndo() 
        } )

        this.setState({currentHistory:
                        [...this.state.currentHistory,
                        {
                            type: tool,
                            pos: pos,
                            height: 0,
                            width: 0,
                            color: color,
                            shapeId: this.state.currentHistory.length,
                            lineSize: lineSize,
                            lineType: lineType
                        }
                        ]
        })

        this.addAction()
    }
    else if (tool === 'select'){
        // draw select if pos isnt on old one
        if (e.target.attrs.id !== 'selectRect' && !this.state.isDraggingSelection) {
            this.setState({isDrawing: true})

            this.setState( state => {
                return {
                    temporaryShapes: {...state.temporaryShapes, selectRect: {
                        x: pos.x, 
                        y: pos.y,
                        height: 0,
                        width: 0
                    }}
                }
            } )
        }
    }
    else if (tool === 'move') {
        this.setState({isDraggingStage: true})
    }

    this.setState({lastPointerPos: pos})
}