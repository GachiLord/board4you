import React from "react";
import { useDispatch, useSelector } from "react-redux";
import boardEvents from "../base/boardEvents";
import { setStagePos } from "../features/stage";


export default function(){
    const dispatch = useDispatch() 
    const stage = useSelector(state => state.stage)
    const pageIndex = Math.round( Math.abs(stage.stagePos.y) / stage.baseHeight ) + 1
    const maxPageIndex = Math.floor(stage.height / stage.baseHeight) - 1

    const handlePageChange = (e) => {
        const newStagePos = { x: 0, y: - stage.baseHeight * (e.target.value - 1) }
        boardEvents.emit('pageSetted', newStagePos)
        dispatch( setStagePos(newStagePos) )
    }


    let pagesIndexes = new Array(Math.max(maxPageIndex, pageIndex)).fill(1)
    pagesIndexes = pagesIndexes.map( (_,i) => i+1 )

    return (
            <select 
                value={pageIndex} 
                className="form-select form-select-sm"
                style={ {width: '5em'} }
                onChange={handlePageChange}
            >
                { pagesIndexes.map( i => <option value={i} key={i}>{i}</option> ) }
            </select>
    )
}