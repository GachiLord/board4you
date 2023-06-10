import { createRoot } from 'react-dom/client';
import Editor from './board/Editor';
import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react';
import getLocalizationCfg from '../common/getLocalizationCfg';
import store from './store/store';
import { Provider } from 'react-redux'
import { LocaleContext } from './base/constants/LocaleContext';
import Progress from './base/components/Progress';


// root
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
// render
root.render(
    <Provider store={store}>
        <LocaleContext.Provider value={getLocalizationCfg(navigator.language)}>
            <Editor />
            <Progress />
        </LocaleContext.Provider>
    </Provider>
)