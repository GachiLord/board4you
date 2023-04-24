import React, { useEffect, useState } from "react";
import useLocalStorageState from "use-local-storage-state";
import getCanvasSize from "../../model/CommonGetCanvasSize";
import boardEvents from "../base/boardEvents";


export default function(){
    const [pageIndex, setPageIndex] = useState(1)
    const [maxPageIndex, setMaxPageIndex] = useState(1)
    const [size] = useLocalStorageState('CanvasSize', {
        defaultValue: getCanvasSize()
    })

    const handlePageChange = (newIndex) => {
        setPageIndex(newIndex)
    }
    const ChangePageIndex = (e) => {
        const newIndex = Number(e.target.value)
        handlePageChange(newIndex)
        boardEvents.emit('pageSetted', { x: 0, y: - size.height * (newIndex - 1) })
    }

    useEffect( () => {
        boardEvents.addListener('stageDragStoped', (pos) => {
            if (pos.y !== 0) handlePageChange(Math.round( Math.abs(pos.y) / size.height ) + 1)
        })
        boardEvents.addListener('stageDragStoped', (_, height) => {
            if (height !== 0) setMaxPageIndex(Math.round(height / size.height))
        })
    } )


    let pagesIndexes = new Array(Math.max(maxPageIndex, pageIndex)).fill(1)
    pagesIndexes = pagesIndexes.map( (_,i) => i+1 )

    return (
            <select 
                value={pageIndex} 
                className="form-select form-select-sm"
                style={ {width: '5em'} }
                onChange={ChangePageIndex}
            >
                { pagesIndexes.map( i => <option value={i} key={i}>{i}</option> ) }
            </select>
    )
}