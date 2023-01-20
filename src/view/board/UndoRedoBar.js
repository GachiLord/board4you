import {IoArrowUndoOutline, IoArrowRedoOutline} from 'react-icons/io5'
import React from 'react'
import { IconContext } from 'react-icons'
import baseIconStyle from '../base/baseIconStyle'
import boardEvents from '../base/boardEvents'


export default function() {
    const value = {
        ...baseIconStyle,
        size: '1.7em'
    }
    return (
        <>
        <IconContext.Provider value={value}>
                <div className='d-flex justify-content-center'>
                    <IoArrowUndoOutline onClick={ () => {boardEvents.emit('undo') } }/>
                    <IoArrowRedoOutline onClick={ () => {boardEvents.emit('redo')} } />
                </div>
        </IconContext.Provider>
        </>
    )
}