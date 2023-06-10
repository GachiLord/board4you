import React, { ChangeEvent, useContext, useEffect, useState } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import boardEvents from '../base/constants/boardEvents'
import useLocalStorageState from 'use-local-storage-state'
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup'
import getCanvasSize from '../../common/getCanvasSize'
import setCanvasSize from '../lib/setCanvasSize'
import { LocaleContext } from '../base/constants/LocaleContext'



export default function SizeDialog() {
    const [size, setSize] = useLocalStorageState('CanvasSize', {
        defaultValue: getCanvasSize()
    })
    const [show, setShow] = useState(false)
    const loc = useContext(LocaleContext)

    const handleClose = () => { 
        setShow(false)
        setCanvasSize(size)
        boardEvents.emit('sizeHasChanged')
      }
    const handleShow = () => setShow(true) 

    const isValid = (v: number) => !isNaN(v) && v <= 4000

    const onChangeHeight = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = Number(e.target.value)
        if (isValid(v)) setSize({...size, height: v})
        
    }
    const onChangeWidth = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = Number(e.target.value)
        if (isValid(v)) setSize({...size, width: v})
    }

    useEffect( () => {
        boardEvents.addListener('selectSize', () => {
            handleShow()
        })
    }, [] )


    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
            <Modal.Title>{loc.selectSizeOfCanvas}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className='d-flex'>
                    <InputGroup className="m-3">
                        <InputGroup.Text id="height">{loc.height}</InputGroup.Text>
                        <Form.Control
                            onChange={onChangeHeight}
                            value={size.height}
                            aria-describedby="height"
                        />
                        <InputGroup.Text id="width">{loc.width}</InputGroup.Text>
                        <Form.Control
                            onChange={onChangeWidth}
                            value={size.width}
                            aria-describedby="width"
                        />
                    </InputGroup>
                </div>
            </Modal.Body>
            <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
                {loc.close}
            </Button>
            </Modal.Footer>
        </Modal>
    );
}
