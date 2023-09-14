import { createRoot } from 'react-dom/client';
import Editor from '../renderer/board/Editor';
import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react';
import getLocalizationCfg from '../common/getLocalizationCfg';
import store from '../renderer/store/store';
import { Provider } from 'react-redux'
import { LocaleContext } from '../renderer/base/constants/LocaleContext';
import Progress from '../renderer/base/components/Progress';


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