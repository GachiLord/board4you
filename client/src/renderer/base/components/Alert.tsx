import Modal from 'react-bootstrap/Modal';
import React from 'react';


interface props{ 
    title?: string | number | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | React.ReactPortal
    children?: string | number | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | React.ReactPortal,
    body?: string | number
}

function Alert(props: props) {
  return (
        <Modal
            show={true}
            backdrop="static"
            keyboard={false}
        >
            {
                props.title && (
                <Modal.Header>
                    <Modal.Title>{props.title}</Modal.Title>
                </Modal.Header>
                )
            }
            {
                props.body && (
                <Modal.Body>
                    {props.body}
                </Modal.Body>
                )
            }
            {
                props.children && (
                <Modal.Footer>
                    {props.children}
                </Modal.Footer>
                )
            }
        </Modal>
  );
}

export default Alert;