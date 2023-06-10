import Modal from 'react-bootstrap/Modal';
import React, { useContext } from 'react';
import { RootState } from '../../store/store';
import { useSelector } from 'react-redux';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { LocaleContext } from '../constants/LocaleContext';


function Progress() {
  const progress = useSelector((state: RootState) => state.progress)
  const percent = Math.round(progress.current / progress.last * 100)
  const local = useContext(LocaleContext)

  return (
        <Modal
            show={progress.isLoading}
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header>
            <Modal.Title>{local.loading} {progress.current}/{progress.last}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ProgressBar animated now={percent}/>
            </Modal.Body>
        </Modal>
  );
}

export default Progress;