import React, { CSSProperties, useState } from "react"
import {GoShareAndroid} from 'react-icons/go'
import ToolButton from "./toolPanel/ToolButton"
import boardEvents from "../base/constants/boardEvents"
import { useDispatch } from "react-redux"
import { setMode } from "../features/board"
import { RootState } from "../store/store"
import { useSelector } from "react-redux"


export default function ShareBar(){
    const [isOpen, setOpen] = useState(false)
    const mode = useSelector( (state: RootState) => state.board.mode )
    const dispatch = useDispatch()
    const closeArea: CSSProperties = {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
    }
    const share: CSSProperties = {
        minWidth: '100px'
    }
    const onShare = () => {
        dispatch(setMode('shared'))
    }

    return (
        <div>
            <ToolButton 
                name={ isOpen ? "none-active": "none" }
                activatedClass="text-success"
            >
                <GoShareAndroid onClick={ () => { setOpen(prev => !prev) } }/>
            </ToolButton>
            { isOpen && (
                <div className="zindex-fixed position-absolute">
                    <div style={closeArea} onClick={() => { setOpen(false) }}></div>
                    <div style={share} className="card p-2 position-absolute">
                        <button 
                            type="button" 
                            disabled={mode === 'shared'} 
                            className="btn btn-outline-primary" 
                            onClick={onShare}
                        >
                        share</button>
                    </div>
                </div>
                )
            }
        </div>
    )
}