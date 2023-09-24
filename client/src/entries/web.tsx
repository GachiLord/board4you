import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import getLocalizationCfg from '../common/getLocalizationCfg';
import store from '../renderer/store/store';
import { Provider } from 'react-redux'
import { LocaleContext } from '../renderer/base/constants/LocaleContext';
import Progress from '../renderer/base/components/Progress';
import Editor from '../renderer/pages/Editor';
import Home from '../renderer/pages/Home';
import Viewer from '../renderer/pages/Viewer';


// root
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
// render
root.render(
    <Provider store={store}>
        <LocaleContext.Provider value={getLocalizationCfg(navigator.language)}>
        <Progress />
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route index element={<Home />} />
                <Route path="edit" element={<Editor />} />
                <Route path="view" element={<Viewer />} />
                <Route path="*" element={<>404</>} />
            </Routes>
        </BrowserRouter>
        </LocaleContext.Provider>
    </Provider>
)