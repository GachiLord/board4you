import { IoSettingsOutline } from 'react-icons/io5'
import React, { useState } from 'react'
import SettingsModal, { settings } from './SettingsModal'
import ToolButton from '../toolPanel/ToolButton'
import store from '../../store/store'
import { setTitle } from '../../features/board'


export default function Settings() {
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
