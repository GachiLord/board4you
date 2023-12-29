import { IoSettingsOutline } from 'react-icons/io5'
import React, { useContext, useState } from 'react'
import SettingsModal, { settings } from './SettingsModal'
import ToolButton from '../toolPanel/ToolButton'
import store, { RootState } from '../../store/store'
import { setTitle } from '../../features/board'
import { useSelector } from 'react-redux'
import BoardManagerContext from '../../base/constants/BoardManagerContext'


export default function Settings() {
  const boardManager = useContext(BoardManagerContext)
  const mode = useSelector((state: RootState) => state.board.mode)
  const [show, setShow] = useState(false)
  const [btnName, setBtnName] = useState<'none' | 'none-active'>('none')
  const setActive = (s: boolean) => {
    if (s) {
      setBtnName('none-active')
      setShow(true)
    }
    else {
      setBtnName('none')
      setShow(false)
    }
  }
  const handleSave = (s: settings) => {
    // update btn
    setActive(false)
    // save state
    store.dispatch(setTitle(s.title))
    // send changes
    if (mode === 'shared') {
      boardManager.send('SetTitle', {
        ...boardManager.getCredentials(),
        title: s.title
      })
    }
  }

  return (
    <>
      <div className='m-2'>
        <ToolButton
          name={btnName}
          customizable={false}
        >
          <IoSettingsOutline
            onClick={() => setActive(true)}
          />
        </ToolButton>
      </div>
      <SettingsModal
        show={show}
        onSave={handleSave}
        onClose={() => setActive(false)}
      />
    </>
  )
}
