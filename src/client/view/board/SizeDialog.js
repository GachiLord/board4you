import React, { useEffect, useState } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import boardEvents from '../base/boardEvents'
import useLocalStorageState from 'use-local-storage-state'
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup'
import getCanvasSize from '../../model/CommonGetCanvasSize'
import setCanvasSize from '../../model/setCanvasSize'



export default function() {
    const [size, setSize] = useLocalStorageState('CanvasSize', {
        defaultValue: getCanvasSize()
    })
    const [show, setShow] = useState(false)
    const handleClose = () => { 
        setShow(false)
        setCanvasSize(size)
        boardEvents.emit('sizeHasChanged')
      }
    const handleShow = () => setShow(true)
    const loc = localizationCfg


    useEffect( () => {
        boardEvents.addListener('selectSize', () => {
            handleShow()
        })
    } )


    const isValid = (v) => !isNaN(v) && v <= 4000
    const onChangeHeight = (e) => {
        let v = Number(e.target.value)
        if (isValid(v)) setSize({...size, height: v})
        
    }
    const onChangeWidth = (e) => {
        let v = Number(e.target.value)
        if (isValid(v)) setSize({...size, width: v})
    }


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
