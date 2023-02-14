import { createRoot } from 'react-dom/client';
import Board from '../view/board/Editor'
import 'bootstrap/dist/css/bootstrap.css'
import React from 'react';
import getLocalizationCfg from '../lib/CommonGetLocalizationCfg';


// add loc cfg
window.global = {
    localizationCfg: getLocalizationCfg(navigator.language)
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <Board />
);