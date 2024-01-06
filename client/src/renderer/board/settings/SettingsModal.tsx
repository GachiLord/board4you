import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";


export interface settings {
  title: string
}

interface props {
  onSave: (s: settings) => void,
  onClose: () => void,
  show: boolean
}

export default function SettingsModal({ onSave, onClose, show }: props) {
  const board = useSelector((state: RootState) => state.board)
  const [title, setTitle] = useState(board.title)
  const handleTitleChange = (title: string) => {
    if (title.length <= 36) setTitle(title)
  }

  return (
    <>
      <Modal show={show}>
        <Modal.Header closeButton onClick={() => onClose()}>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                onChange={(e) => handleTitleChange(e.target.value)}
                defaultValue={board.title}
                type="text"
                placeholder="Enter title"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onSave({
            title: title
          })}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
