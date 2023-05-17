import { createRoot } from 'react-dom/client';
import Board from '../view/board/Editor'
import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react';
import getLocalizationCfg from '../lib/CommonGetLocalizationCfg';
import store from '../view/store/store';
import { Provider } from 'react-redux'


// add loc cfg
globalThis.localizationCfg = getLocalizationCfg(navigator.language)

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <Provider store={store}>
        <Board />
    </Provider>
);