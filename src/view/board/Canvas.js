import React from 'react';
import { Stage, Layer, Line, Arrow, Rect, Transformer } from 'react-konva';
import { v4 as uuid4 } from 'uuid';
import { flushSync } from "react-dom";
import CanvasImage from './CanvasImage';
import CanvasUtils from '../../model/CanvasUtils';
import canvasSize from '../../model/CommonCanvasSize'
import boardEvents from '../base/boardEvents';


export default class Canvas extends React.Component{

    constructor(props){
        super(props)
        this.electronAPI = window.electronAPI
        this.width = canvasSize.width,
        this.baseHeight = canvasSize.height
        this.baseState = {
                    height: this.baseHeight,
                    isDrawing: false,
                    currentHistory: [],
                    temporaryShapes: [],
                    historyActions: [],
                    canceledHistoryActions: [],
                    selection: [],
                    isDraggingSelection: false,
                    stagePos: {x: 0,y: 0},
                    lastPointerPos: {x:0, y:0},
                    isDraggingStage: false,
                    renderOutOfViewElements: false 
                }
        this.state = this.baseState
        this.stage = React.createRef()
        this.stageWrap = React.createRef() 
    }

    getCurrentHistoryAcActions = () => {
        const currentHistory = this.state.currentHistory.slice()
        let history = currentHistory
        let endIndex = 0 // for add last action
        let removedShapesIds = []

        //if (this.state.isDraggingSelection) return currentHistory


        this.state.historyActions.forEach( (item) => {
            switch (item.action) {
                case 'add last':
                    endIndex++
                    break

                case 'move':
                    item.shapes.forEach( (shape) => {
                        const id = shape.attrs.shapeId
                        const pos = CanvasUtils.findShapes(history, {shapeId: id})[0].pos
                        const oldPos = item.oldPos
                        const newPos = item.newPos
                        history = CanvasUtils.getHistoryWithChanges(
                                                        history,
                                                        {shapeId: id},
                                                        {pos: {x: newPos.x - (oldPos.x - pos.x),
                                                               y: newPos.y - (oldPos.y - pos.y) }}
                                                        )
                    } )
                    break
                case 'remove':
                    item.shapes.forEach( i => { removedShapesIds.push(i.attrs.shapeId) } )
                    break
            }
        } )

        history = history.slice(0,endIndex) // accept add last changes
        history = history.filter( i => !removedShapesIds.includes(i.shapeId) ) // accept remove changes

        return history
    }

    addAction = (action = {action: 'add last'}) => {
        this.setState( state => {
            return {
                historyActions: [...state.historyActions, action]
            }
        } )
    }

    acceptCurrentHistoryChanges = () => { 
        let historyWithChanges = this.getCurrentHistoryAcActions()
        
        this.setState( () => {
            return {
                canceledHistoryActions: [],
                historyActions: historyWithChanges.map( () => {return {action: 'add last'}} ),
                currentHistory: historyWithChanges
            }
        } )
        
    }


    handleUndo = () => {
        let lastAction = this.state.historyActions.at(-1)

        if (lastAction !== undefined) {
            this.setState( state => {
                return {
                    historyActions: state.historyActions.slice(0,-1),
                    canceledHistoryActions: [...state.canceledHistoryActions, lastAction]
                }
            } )
        }
        }
        
    handleRedo = () => {
        let lastAction = this.state.canceledHistoryActions.at(-1)

        if (lastAction !== undefined) {
            this.setState( state => {
                return {
                    historyActions: [...state.historyActions, lastAction],
                    canceledHistoryActions: state.canceledHistoryActions.slice(0,-1)
                }
            } )
        }
        }

    handleDrawAfterUndo = () => {
        if (this.state.canceledHistoryActions.length > 0) this.acceptCurrentHistoryChanges()
    }

    handleSelectDragAfterUndo = () => {
        if (this.state.canceledHistoryActions.length > 0) this.setState({canceledHistoryActions: []})
    }

    setCursor = (style = 'default') => {
        this.stage.current.container().style.cursor = style
    }

    setCursorForTool = () => {
        const tool = this.props.tool
        const setCursor = this.setCursor

        switch(tool){
            case 'move':
                setCursor('move')
                break
            case 'select':
                setCursor('crosshair')
                break
            case 'rect':
                setCursor('crosshair')
                break
            default:
                setCursor()
                break
        }
    }

    handleMouseDown = (e) => {
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
                    shapeId: uuid4(),
                    pos: {x: 0, y: 0},
                    lineSize: lineSize,
                    lineType: lineType
                }]
            })

            this.addAction()
        }
        else if (tool === 'rect'){
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
                                shapeId: uuid4(),
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
    
    handleMouseMove = (e) => {
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
        else if (tool === 'rect'){
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
            } )
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

    handleDownCanvasClick = (pointerPos) => {
        // create new page if user is on edge
        if (pointerPos.y >= this.state.height - 300) this.increaseHeight();
    }

    increaseHeight(ratio = 1) {
        this.setState((state) => { return { height: state.height + this.baseHeight * ratio }; });
    }

    setHeight(height){
        this.setState({height: height})
    }

    handleStopDrawing = (e) => {
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
                    if (Konva.Util.haveIntersection(box, CanvasUtils.getClientRect(shape))) return shape
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

    removeSelectRect = () => {
        this.setState( state => {
            return {
                temporaryShapes: {
                    ...state.temporaryShapes,
                    selectRect: undefined
                },
                selection: []
            }
        } )
    }

    handleSelectDragStart = (e) => {
        if (this.state.selection.length > 0) {
            flushSync( () => {
                this.handleDrawAfterUndo()
            } )

            this.setState( (state) => { 
                const selectRect = {...state.temporaryShapes.selectRect}
                return {historyActions: [...state.historyActions, 
                    {
                        action: 'move',
                        shapes: state.selection,
                        oldPos: {x: selectRect.x + this.state.stagePos.x,
                                 y: selectRect.y + this.state.stagePos.y},
                        newPos: e.target._lastPos
                    }
                ],
                        isDraggingSelection: true
                    }
            })
        }
        
    }

    handleSelectDragMove = (e) => {
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

    handleSelectDragEnd = () => {
        this.setState({isDraggingSelection: false})
    }

    paste = (url, size, delta = 20) => {
        let scale = (size.width - this.width) / this.baseHeight        
        if (scale <= 1) scale = 1

        const height = size.height / scale 
        const width = (size.width > this.width) ? this.width : size.width
        const x = 0
        const y = CanvasUtils.getLastY(this.getCurrentHistoryAcActions()) + delta
        console.log(y)
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
                    shapeId: uuid4()
                    }
                ]
                }
            } )

            if (y + height > this.state.height) this.increaseHeight( Math.round(scale) )
            this.addAction()
    }

    runOption = async (o, data) => {
        console.log(o)
        switch (o) {
            case 'newFile':
                flushSync( () => this.setState(this.baseState))
                break;
            case 'openFile':   
                try{
                    const files = data.base64
                    const type = data.type
                    const path = data.path
                    if (files.length > 0) {
                        flushSync( () => this.setState(this.baseState))

                        switch(type){
                            case 'pdf':
                                let imgs = await CanvasUtils.getPdfAsBase64imgs(path)
                                for (let i in imgs){
                                    let img = imgs[i]
                                    this.paste(img, await CanvasUtils.getSizeOfBase64Img(img), 0 )
                                }
                                break
                            case 'png':
                                for(let img in files){
                                    let i = files[img]
                                    this.paste(i, await CanvasUtils.getSizeOfBase64Img(i), 0 )
                                }
                                break
                        }

                        
                    }
                    
                }
                catch{
                }
                break;
            case 'saveFile':
                this.electronAPI.saveFile(await this.getStageAsUrl())
                break;
            case 'saveFileAs':
                this.electronAPI.saveFileAs(await this.getStageAsUrl())
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

    getStageAsUrl = async () => {
        flushSync( () => this.setState({renderOutOfViewElements: true}) )
        const stagePos = this.state.stagePos
        const width = this.width
        const lastY = CanvasUtils.getLastY(this.getCurrentHistoryAcActions())


        let urls = []
        for (let y = stagePos.y; y <= lastY - Math.abs(stagePos.y) ; y += this.baseHeight){
            if (y >= lastY) break
            urls.push(
                this.stage.current.toDataURL({
                    x: stagePos.x,
                    y: y,
                    width: width,
                    height: this.baseHeight
                })
            )
        }
        

        flushSync( () => this.setState({renderOutOfViewElements: false}) )
        return urls
    }

    copySelectionToClipBoard = () => {
        let selectRect = this.state.temporaryShapes.selectRect
        selectRect.x += 2
        selectRect.y += 2 - Math.abs(this.state.stagePos.y)
        selectRect.height -= 4
        selectRect.width -= 4
        navigator.clipboard.write([
            new ClipboardItem({
                'image/png': this.stage.current.toBlob(selectRect)
            })
        ]);
    }

    componentDidMount = () => {
        // custom electron events listener
        if (this.electronAPI !== undefined) {
            this.electronAPI.onMenuButtonClick( (_, o, d) => {this.runOption(o, d)} )
        }
        else console.warn('electronApi is not found')
        // fbemitter events listener
        boardEvents.addListener('undo', () => { this.runOption('undo') })
        boardEvents.addListener('redo', () => { this.runOption('redo') })         
        // web events listeners
        window.addEventListener('paste', (e) => {
            CanvasUtils.retrieveImageFromClipboardAsBase64(e, (url, size) => {
                this.paste(url, size)
                
            })
        });
        window.addEventListener('copy', () => {
            this.copySelectionToClipBoard()
            this.removeSelectRect()
        })
        window.addEventListener('cut', () => {
            this.copySelectionToClipBoard()
            this.runOption('del')
            this.removeSelectRect()
        })
        
    }

    componentDidUpdate = () => {
        //this.stage.current.children[0].cache()
        //console.log(this.stage.current.children[1].children)
        //console.log(this.context)
        //if (this.context !== '') this.props.onOptionRan()
    }

    handleFieldOfViewChange = () => {
        //console.log(this.stage.current.getClientRect())
    }

    render = () => {
        let history = this.getCurrentHistoryAcActions()
        if (!this.state.renderOutOfViewElements) {
            history = CanvasUtils.getViewedHisotry(history, 
            {
                x: 0, y: Math.abs(this.state.stagePos.y),
                height: Math.abs(this.state.stagePos.y) + this.baseHeight, width: this.width
            })
        }

        
        const temporaryShapes = this.state.temporaryShapes
        // create dashed lines between pages if not saving
        let pageLinesY = [] 
        if (!this.state.renderOutOfViewElements) {
            for (let i = this.baseHeight; i <= this.state.height; i += this.baseHeight ){
                pageLinesY.push(i)
            }
        }
        

        return (
            <div className="d-flex justify-content-center" ref={this.stageWrap}>
                <Stage
                    ref={this.stage}
                    className="border"
                    width={this.width}
                    height={this.baseHeight}
                    onMouseDown={this.handleMouseDown}
                    onMouseMove={this.handleMouseMove}
                    onMouseup={this.handleStopDrawing}
                    onMouseLeave={this.handleStopDrawing}
                    onMouseEnter={this.setCursorForTool}
                    x={this.state.stagePos.x}
                    y={this.state.stagePos.y}
                    >
                    {
                        (this.state.renderOutOfViewElements) && (
                            <Layer listening={false}>
                                <Rect
                                        x={0}
                                        y={0}
                                        width={this.width}
                                        height={this.state.height + this.baseHeight}
                                        shadowForStrokeEnabled={false}
                                        key='background'
                                        fill='white'
                                        globalCompositeOperation='source-over'
                                    />
                            </Layer>
                        )
                    }
                    
                    <Layer listening={false}>
                        {history.map((shape) => {
                            switch (shape.type) {
                                case 'arrow':
                                    return (
                                        <Arrow
                                            y={shape.pos.y}
                                            x={shape.pos.x}
                                            shapeId={shape.shapeId}
                                            key={shape.shapeId}
                                            points={shape.points}
                                            stroke={shape.color}
                                            fill={shape.color}
                                            strokeWidth={shape.lineSize}
                                            tension={0.5}
                                            lineCap="round"
                                            lineJoin="round"
                                            hitStrokeWidth={25}
                                            shadowForStrokeEnabled={false}
                                            globalCompositeOperation= 'source-over'
                                            tool={shape.tool}
                                            dash={shape.lineType === 'general' ? []: [10, 10]}
                                        />
                                    )
                            
                                case 'img':
                                    return (
                                        <CanvasImage
                                            shapeId={shape.shapeId}
                                            url={shape.url}
                                            x={shape.pos.x}
                                            y={shape.pos.y}
                                            width={shape.width}
                                            height={shape.height}
                                            key={shape.shapeId}
                                            tool={shape.tool}
                                        />
                                    )
                                case 'rect':
                                    return (
                                        <Rect
                                            x={shape.pos.x}
                                            y={shape.pos.y}
                                            width={shape.width}
                                            height={shape.height}
                                            stroke={shape.color}
                                            strokeWidth={shape.lineSize}
                                            shadowForStrokeEnabled={false}
                                            shapeId={shape.shapeId}
                                            key={shape.shapeId}
                                            globalCompositeOperation='source-over'
                                            tool={shape.tool}
                                            dash={shape.lineType === 'general' ? []: [10, 10]}
                                        />
                                    )
                                case 'line':
                                    return (
                                        <Line
                                            pos={shape.pos}
                                            y={shape.pos.y}
                                            x={shape.pos.x}
                                            shapeId={shape.shapeId}
                                            key={shape.shapeId}
                                            points={shape.points}
                                            stroke={shape.color}
                                            strokeWidth={shape.lineSize}
                                            dash={shape.lineType === 'general' ? []: [10, 10]}
                                            tension={0.5}
                                            lineCap="round"
                                            lineJoin="round"
                                            hitStrokeWidth={25}
                                            shadowForStrokeEnabled={false}
                                            globalCompositeOperation={shape.tool === 'eraser' ? 'destination-out' : 'source-over'}
                                            tool={shape.tool}
                                        />)
                            }
                        }      
                    )}           
                    </Layer>
                    <Layer>
                    {
                        (temporaryShapes.selectRect !== undefined) &&
                            (
                                <Rect
                                    x={temporaryShapes.selectRect.x}
                                    y={temporaryShapes.selectRect.y}
                                    width={temporaryShapes.selectRect.width}
                                    height={temporaryShapes.selectRect.height}
                                    stroke='blue'
                                    strokeWidth={2}
                                    opacity={0.5}
                                    dash={[20, 10]}
                                    id='selectRect'
                                    onDragStart={this.handleSelectDragStart}
                                    onDragEnd={this.handleSelectDragEnd}
                                    onDragMove={this.handleSelectDragMove}
                                    onMouseEnter={() => {this.setCursor('grab')}}
                                    onMouseLeave={() => {this.setCursorForTool()}}
                                    shadowForStrokeEnabled={false}
                                    draggable
                                />
                            )
                    }
                    {
                        pageLinesY.map( (y) => {
                            return (<Line
                                        key={y}
                                        points={[0, y, this.width, y]}
                                        stroke={'black'}
                                        strokeWidth={2}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                        hitStrokeWidth={25}
                                        globalCompositeOperation={'source-over'}
                                        dash={[20, 10]}
                                        opacity={0.2}
                                        shadowForStrokeEnabled={false}
                                    />)
                        } )
                        }
                    </Layer>
                </Stage>
            </div>
        )
    }
}