import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import React from 'react';
import { Spinner } from 'react-bootstrap';


interface props{ 
    title?: string | number | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | React.ReactPortal
    children?: string | number | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> | Iterable<React.ReactNode> | React.ReactPortal,
}

function Example(props: props) {
  
  return (
    <>
      <Modal show={true}>
        { props.title && (
            <Modal.Header>
                <Modal.Title>{props.title}</Modal.Title>
            </Modal.Header>
        ) }
        <Modal.Body className='text-center'>
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
            </Spinner>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Example;