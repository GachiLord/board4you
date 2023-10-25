import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import getLocalizationCfg from '../common/getLocalizationCfg';
import store from '../renderer/store/store';
import { Provider } from 'react-redux'
import { LocaleContext } from '../renderer/base/constants/LocaleContext';
import Editor from '../renderer/pages/Editor';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Progress from '../renderer/base/components/Progress';


// root
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
// render
root.render(
    <Provider store={store}>
        <LocaleContext.Provider value={getLocalizationCfg(navigator.language)}>
        <BrowserRouter>
            <Routes>
                <Route path="*" element={(<><Progress /><Editor /></>)} />
            </Routes>
        </BrowserRouter>
        </LocaleContext.Provider>
    </Provider>
)