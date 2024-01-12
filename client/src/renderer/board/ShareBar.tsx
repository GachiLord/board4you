import React, { CSSProperties, useContext, useState } from "react"
import { GoShareAndroid } from 'react-icons/go'
import ToolButton from "./toolPanel/ToolButton"
import { useDispatch } from "react-redux"
import { setMode } from "../features/board"
import { RootState } from "../store/store"
import { useSelector } from "react-redux"
import boardEvents from "../base/constants/boardEvents"
import isMobile from "../lib/isMobile"
import { LocaleContext } from "../base/constants/LocaleContext"
import { useParams } from "react-router"


export default function ShareBar() {
  // state
  const loc = useContext(LocaleContext)
  const isDeviceMobile = isMobile()
  const [isOpen, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const board = useSelector((state: RootState) => state.board)
  const dispatch = useDispatch()
  const { roomId } = useParams()
  // css
  const closeArea: CSSProperties = {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  }
  const share: CSSProperties = {
    bottom: isDeviceMobile && '160px',
    minWidth: '100px',
    zIndex: 4
  }
  // handlers
  const onShare = () => {
    if (board.mode === 'local') {
      boardEvents.emit('roomCreated')
      dispatch(setMode('shared'))
      setOpen(false)
    }
    else {
      navigator.clipboard.writeText(`${location.host}/board/${roomId}/${board.inviteId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div>
      <ToolButton
        name={isOpen ? "none-active" : "none"}
        activatedClass="text-success"
      >
        <GoShareAndroid onClick={() => { setOpen(prev => !prev) }} />
      </ToolButton>
      {isOpen && (
        <div className="zindex-fixed position-absolute">
          <div style={closeArea} onClick={() => { setOpen(false) }}></div>
          <div style={share} className="card p-2 position-absolute">
            <button
              disabled={board.mode === 'shared' && !board.inviteId || copied}
              type="button"
              className="btn btn-outline-primary"
              onClick={onShare}
            >
              {board.mode === 'local' && 'Share'}
              {(board.mode === 'shared' && !copied) && 'Invite editor'}
              {(board.mode === 'shared' && copied) && 'Copied'}
            </button>
          </div>
        </div>
      )
      }
    </div>
  )
}
