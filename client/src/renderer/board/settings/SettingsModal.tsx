import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';


export interface settings {
  title: string
}

interface props {
  onSave: (s: settings) => void,
  onClose: () => void,
  show: boolean
}

export default function SettingsModal({ onSave, onClose, show }: props) {
  const [settings, setSettings] = useState({
    title: 'untitled'
  })

  return (
    <>
      <Modal show={show}>
        <Modal.Header closeButton onClick={() => onClose()}>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                onChange={(e) => setSettings({
                  ...settings,
                  title: e.target.value
                })}
                value={settings.title}
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
          <Button variant="primary" onClick={() => onSave(settings)}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
