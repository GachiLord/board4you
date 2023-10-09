import CanvasUtils from "../../../../lib/CanvasUtils";
import { itemIn, run, whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../../features/stage";
import { addCurrent } from "../../../../features/history";
import store from "../../../../store/store";
import Konva from "konva";
import Selection from "../../../../lib/Selection";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { IRect } from "konva/lib/types";
import { Arrow } from "konva/lib/shapes/Arrow";
import { setCursor } from "../func/cursor";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import { Edit } from "../../../../lib/EditManager";
import { convertToStrings } from "../../share/convert";


export default function(e: KonvaEventObject<MouseEvent>, boardManager: BoardManager, props: IDrawerProps){
    const state = store.getState()
    const isShared = state.board.mode === 'shared'
    const isDrawing = state.stage.isDrawable
    const drawingShapeId = state.stage.drawingShapeId
    const private_id = state.rooms[boardManager.status.roomId]
    const tool = props.tool


    whenDraw( e, boardManager, ({stage, canvas, temporary}) => {
        // share fun
        const shareSegment = (shapeId: string) => {
            if (isShared)
            boardManager.send('PushSegment', {
                public_id: boardManager.status.roomId,
                private_id: private_id,
                action_type: 'End',
                data: shapeId
            } )
        }
        const share = (edit: Edit) => {
            if (isShared)
            boardManager.send('Push', {
                public_id: boardManager.status.roomId,
                private_id: private_id,
                data: convertToStrings([edit]),
                silent: true
            } )
        }
        // type of event
        const isMouseLeave = e.type === 'mouseleave'

        if (isMouseLeave) setCursor(stage)
        run( api => {
            if (!itemIn(tool, 'move', 'select') && !isMouseLeave) api.handleFileChange()
        } )

        if (itemIn(tool, 'pen', 'eraser', 'arrow', 'line') && isDrawing && drawingShapeId){
            const lastLine: unknown = CanvasUtils.findLastOne(canvas, { shapeId: drawingShapeId })
            // validate lastLine
            if (!(lastLine instanceof Line || lastLine instanceof Arrow)) throw new TypeError('last created element must be a Line or an Arrow')
            // save
            const points = lastLine.attrs.points
            
            if (points.length === 2){
                lastLine.points([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
            }
            // cache the line to improve perfomance
            lastLine.cache()
            // add line to history
            const edit: Edit = {id: lastLine.attrs.shapeId, type: 'add', shape: CanvasUtils.toShape(lastLine)}
            store.dispatch(addCurrent(edit))
            // send PushSegmentEnd msg
            shareSegment(drawingShapeId)
            share(edit)
        }
        else if (itemIn(tool, 'rect', 'ellipse') && isDrawing && drawingShapeId){
            const lastShape: unknown = CanvasUtils.findLastOne(canvas, { shapeId: drawingShapeId })
            // validate lastLine
            if (!(lastShape instanceof Rect || lastShape instanceof Ellipse)) throw new TypeError('last created element must be an Ellipse or Rect')
            // save
            const edit: Edit = {id: lastShape.attrs.shapeId, type: 'add', shape: CanvasUtils.toShape(lastShape)}
            store.dispatch(addCurrent(edit))
            // send PushSegmentEnd msg
            shareSegment(drawingShapeId)
            share(edit)
        }
        else if (tool === 'select' && isDrawing && temporary.children[0]){
            const shapes = canvas.children
            const box = temporary.children[0]
            // validate
            if (!(box instanceof Konva.Rect)) throw new TypeError(`last created temporary shape must be a Rect`)
            const clientRect: IRect = box.getClientRect()
    
            // offset negative wifth and height
            if (clientRect.width < 0){
                clientRect.x += box.width()
                clientRect.width = Math.abs(clientRect.width)
            }
            if (clientRect.height < 0){
                clientRect.y += clientRect.height
                clientRect.height = Math.abs(clientRect.height)
            }
            
            const selected: Konva.Shape[] = []
            let resizable: boolean = null
            // find shapes which have interception with clientRect
            shapes.forEach( shape => {
                if (Konva.Util.haveIntersection(clientRect, shape.getClientRect())){
                    resizable = shape.attrs.connected.size === 0 && resizable !== false

                    if (shape instanceof Konva.Shape) selected.push(shape)
                    shapes.forEach(i => {
                        if (shape.attrs.connected.has(i.attrs.shapeId) && i instanceof Konva.Shape){
                            selected.push(i)
                        }
                    })
                }
            } )
            // create transformer for them
            if (selected.length !== 0){
                Selection.create(selected, boardManager)
            }
            box.destroy()
        }
    } )


    store.dispatch(setDrawable(false))
}