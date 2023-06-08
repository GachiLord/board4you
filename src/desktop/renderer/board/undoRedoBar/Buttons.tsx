import React from "react"
import baseIconStyle from "../../base/style/baseIconStyle"
import { IconContext } from "react-icons"
import { IoArrowUndoOutline, IoArrowRedoOutline } from 'react-icons/io5'
import boardEvents from '../../base/constants/boardEvents'



const size = '1.7em'

export function Undo(props: { style: IconContext; onClick: () => void }){
    return (
        <IconContext.Provider value={{...baseIconStyle, size: size, ...props.style}}>
            <IoArrowUndoOutline onClick={ () => { props.onClick(); boardEvents.emit('undo') } }/>
        </IconContext.Provider>
    )
}

export function Redo(props: { style: IconContext; onClick: () => void }){
    return (
        <IconContext.Provider value={{...baseIconStyle, size: size, ...props.style}}>
            <IoArrowRedoOutline onClick={ () => { props.onClick(); boardEvents.emit('redo') } } />
        </IconContext.Provider>
    )
}