import React from "react"
import baseIconStyle from "../../base/baseIconStyle"
import { IconContext } from "react-icons"
import { IoArrowUndoOutline, IoArrowRedoOutline } from 'react-icons/io5'
import boardEvents from "../../base/boardEvents"



const size = '1.7em'

export function Undo(props) {
    return (
        <IconContext.Provider value={{...baseIconStyle, size: size, ...props.style}}>
            <IoArrowUndoOutline onClick={ () => { props.onClick(); boardEvents.emit('undo') } }/>
        </IconContext.Provider>
    )
}

export function Redo(props){
    return (
        <IconContext.Provider value={{...baseIconStyle, size: size, ...props.style}}>
            <IoArrowRedoOutline onClick={ () => { props.onClick(); boardEvents.emit('redo') } } />
        </IconContext.Provider>
    )
}