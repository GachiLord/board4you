import React, { useRef } from "react";
import { mouseDown, mouseMove, mouseUp, selectDragMove, selectDragStart, selectDragEnd, setCursorForTool, setCursor } from './mouse/';
import Canvas from "./Canvas";
import { useSelector } from "react-redux";
import CanvasUtils from "../../../lib/CanvasUtils";


export default function(props){
    const ref = useRef(null)
    // define redux reducers
    const stage = useSelector(state => state.stage)
    const select = useSelector(state => state.select)
    // get whole history or part of it in view
    const history = useSelector(state => state.history)
    const viewBox = {
        x: 0, y: Math.abs(stage.stagePos.y),
        height: Math.abs(stage.stagePos.y) + stage.baseHeight, width: stage.width
    }
    const currentHistory = CanvasUtils.getHistoryAcActions(history.currentHistory, history.historyActions)
    const historyToRender = stage.renderOutOfView ? currentHistory: CanvasUtils.getViewedHistory(currentHistory, viewBox)
    // create dashed lines between pages if not saving
    let pageLinesY = []
    // preventing infinite loop and removing lines when saving
    if (!stage.renderOutOfView && stage.baseHeight !== 0) {
        for (let i = stage.baseHeight; i <= stage.height; i += stage.baseHeight ){
            pageLinesY.push(i)
        }
    }

    return (
        <Canvas
            ref={ref}
            width={stage.width}
            baseHeight={stage.baseHeight}
            height={stage.height}
            stagePos={stage.stagePos}
            history={historyToRender}
            temporaryShapes={{ selectRect: select.attrs }}
            pageLinesY={pageLinesY}
            renderOutOfViewElements={stage.renderOutOfView}
            
            onStageMouseDown={(e) => {mouseDown(e, props)}}
            onStageMouseMove={(e) => {mouseMove(e, props)}}
            onStageMouseup={(e) => {mouseUp(e, props)}}
            //onStageMouseLeave={(e) => {mouseUp(e, props)} }
            onStageMouseEnter={(e) => {setCursorForTool(ref, props)}}
            
            onSelectDragStart={(e) => {selectDragStart(e, props)}}
            onSelectDragEnd={(e) => {selectDragEnd(e, props)}}
            onSelectDragMove={(e) => {selectDragMove(e, props)}}
            onSelectMouseEnter={() => {setCursor(ref, 'grab')}}
            onSelectMouseLeave={() => {setCursorForTool(ref, props)}}
        />
    )
}