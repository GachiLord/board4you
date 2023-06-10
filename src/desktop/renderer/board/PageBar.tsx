import React, { ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import boardEvents from '../base/constants/boardEvents'
import { setStagePos } from "../features/stage";
import { RootState } from "../store/store";


export default function PageBar(){
    const dispatch = useDispatch() 
    const stage = useSelector((state: RootState) => state.stage)
    const pageIndex = Math.round( Math.abs(stage.stagePos.y) / stage.baseHeight ) + 1
    const maxPageIndex = Math.floor(stage.height / stage.baseHeight)

    const handlePageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        // get valid page index
        const value: number = isNaN(Number(e.target.value)) ? 1: Number(e.target.value)
        // set page
        const newStagePos = { x: 0, y: - stage.baseHeight * (value - 1) }
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