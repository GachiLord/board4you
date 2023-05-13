import React from 'react';
import CanvasUtils from '../../../lib/CanvasUtils';
import boardEvents from '../../base/boardEvents';
import Canvas from './Canvas';
import getCanvasSize from '../../../model/CommonGetCanvasSize';
import { mouseDown, mouseMove, mouseUp, removeSelectRect, selectDragMove, selectDragStart, setCursorForTool } from './mouseHandlers'
import runOption from './electron/runOption';
import { run } from '../../../lib/twiks';
import { copySelectionToClipBoard, paste, getStageAsUrls } from './imgManipulation';

export default class Drawer extends React.Component{

    constructor(props){
        super(props)
        this.electronAPI = window.electronAPI
        this.state = this.getBaseState()
        this.stage = React.createRef()
        if (this.electronAPI) this.electronAPI.setCanvasSize(getCanvasSize())
    }

    getBaseState(){
        return {
            height: getCanvasSize().height,
            // height of canvas
            baseHeight: getCanvasSize().height,
            // height of visible part of canvas
            width: getCanvasSize().width,
            // width of canvas
            isDrawing: false,
            // flag is active when mouse key is pressed on canvas 
            currentHistory: [],
            // history built by getCurrentHistoryAcActions()
            temporaryShapes: {},
            /* 
            these shapes will display outside of the drawing layer
            and they should be removed after an operation
            */
            historyActions: [], 
            // actions that have been taken (REDO)
            canceledHistoryActions: [], 
            // actions that have been undone (UNDO)
            selection: [],
            // shapes that are selected and that can be draged
            isDraggingSelection: false,
            // flag is active when mouse key is pressed on selection rect
            stagePos: {x: 0,y: 0},
            // the parameter is responsible for the position of the scope
            lastPointerPos: {x:0, y:0},
            // position of the last click
            isDraggingStage: false,
            // active when selected tool is "move"
            renderOutOfViewElements: false
            /*
            if flag is active all shapes will be rendered
            Otherwise, only visible shapes will be rendered
            */
        }
    }

    addAction = (action = {action: 'add last'}) => {
        // update state
        this.setState( state => {
            return {
                historyActions: [...state.historyActions, action]
            }
        } )
        // handleFileChange
        if ( this.electronAPI !== undefined ) this.electronAPI.handleFileChange()
    }

    getCurrentHistoryAcActions = () => {
        // create deep copy of history to prevent mutations
        let history = JSON.parse(JSON.stringify(this.state.currentHistory))

        return CanvasUtils.getHistoryAcActions(history, this.state.historyActions)
    }

    acceptCurrentHistoryChanges = () => {
        let historyWithChanges = CanvasUtils.getHistoryAcActions(this.state.currentHistory, this.state.historyActions)
        
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

    setCursorForTool = () => setCursorForTool.call(this)

    handleMouseDown = (e) => mouseDown.call(this, e)
    
    handleMouseMove = (e) => mouseMove.call(this, e)

    handleMouseUp = (e) => mouseUp.call(this, e)

    handleDownCanvasClick = (pointerPos) => {
        // create new page if user clicked on edge
        if (pointerPos.y >= this.state.height - 300) this.increaseHeight();
        boardEvents.emit('stageDragStoped', this.state.stagePos, this.state.height)
    }

    increaseHeight(ratio = 1) {
        this.setState((state) => { return { height: state.height + this.state.baseHeight * ratio }; });
    }

    setHeight(height){
        this.setState({height: height})
    }

    removeSelectRect = () => removeSelectRect.call(this)

    handleSelectDragStart = () => selectDragStart.call(this)

    handleSelectDragMove = (e) => selectDragMove.call(this, e)

    handleSelectDragEnd = () => this.setState({isDraggingSelection: false})

    paste = (url, size, delta = 20) => {
        paste.call(this, url, size, delta = 20)
    }

    runOption = async (o, data) => {
        runOption.call(this, o, data)
    }

    getStageAsUrls = () => {
        return getStageAsUrls.call(this)
    }

    copySelectionToClipBoard = () => {
        copySelectionToClipBoard.call(this)
    }

    componentDidMount = () => {
        // custom electron events listener
        run( () => {
            this.electronAPI.onMenuButtonClick( (_, o, d) => {this.runOption(o, d)} )
        } )
        // fbemitter event listeners
        boardEvents.addListener('undo', () => { this.runOption('undo') })
        boardEvents.addListener('redo', () => { this.runOption('redo') })
        boardEvents.addListener('SizeHasChanged', () => {
            const size = getCanvasSize()
            this.setState({baseHeight: size.height, width: size.width})
        })
        boardEvents.addListener('pageSetted', (pos) => {
            this.setState({stagePos: pos})
        })
        // web event listeners
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

    render = () => {
        let history = this.getCurrentHistoryAcActions()
        const renderOutOfViewElements = this.state.renderOutOfViewElements
        if (!renderOutOfViewElements) {
            history = CanvasUtils.getViewedHisotry(history, 
            {
                x: 0, y: Math.abs(this.state.stagePos.y),
                height: Math.abs(this.state.stagePos.y) + this.state.baseHeight, width: this.width
            })
        }

        
        const temporaryShapes = this.state.temporaryShapes
        // create dashed lines between pages if not saving
        let pageLinesY = [] 
        // preventing infinite loop and removing lines when saving
        if (!renderOutOfViewElements && this.state.baseHeight !== 0) {
            for (let i = this.state.baseHeight; i <= this.state.height; i += this.state.baseHeight ){
                pageLinesY.push(i)
            }
        }

        return (
            <Canvas 
                ref={this.stage}
                width={this.state.width}
                baseHeight={this.state.baseHeight}
                height={this.state.height}
                stagePos={this.state.stagePos}
                history={history}
                temporaryShapes={temporaryShapes}
                pageLinesY={pageLinesY}
                renderOutOfViewElements={renderOutOfViewElements}

                onStageMouseDown={this.handleMouseDown}
                onStageMouseMove={this.handleMouseMove}
                onStageMouseup={this.handleMouseUp}
                onStageMouseLeave={this.handleMouseUp}
                onStageMouseEnter={this.setCursorForTool}
                
                onSelectDragStart={this.handleSelectDragStart}
                onSelectDragEnd={this.handleSelectDragEnd}
                onSelectDragMove={this.handleSelectDragMove}
                onSelectMouseEnter={() => {this.setCursor('grab')}}
                onSelectMouseLeave={() => {this.setCursorForTool()}}
            />
        )
    }
}