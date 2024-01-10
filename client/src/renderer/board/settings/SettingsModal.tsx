import React, { useContext, useState } from "react";
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { LocaleContext } from "../../base/constants/LocaleContext";
import boardEvents from "../../base/constants/boardEvents";


export interface settings {
  title: string
}

interface props {
  onSave: (s: settings) => void,
  onClose: () => void,
  show: boolean
}

export default function SettingsModal({ onSave, onClose, show }: props) {
  const loc = useContext(LocaleContext)
  const board = useSelector((state: RootState) => state.board)
  const [title, setTitle] = useState(board.title)
  const handleTitleChange = (title: string) => {
    if (title.length <= 36) setTitle(title)
  }
  const openSizePicker = () => {
    boardEvents.emit('selectSize')
    onClose()
  }

  return (
    <>
      <Modal show={show}>
        <Modal.Header closeButton onClick={() => onClose()}>
          <Modal.Title>{loc.settings}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-3">
              <Form.Label>{loc.title}</Form.Label>
              <Form.Control
                onChange={(e) => handleTitleChange(e.target.value)}
                defaultValue={board.title}
                type="text"
                placeholder={loc.title}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{loc.size}</Form.Label>
            </Form.Group>
            <Button
              onClick={openSizePicker}
              variant="success"
            >
              {loc.selectSize}
            </Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            {loc.close}
          </Button>
          <Button variant="primary" onClick={() => onSave({
            title: title
          })}>
            {loc.save}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
