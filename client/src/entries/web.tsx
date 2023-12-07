import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import getLocalizationCfg from '../common/getLocalizationCfg';
import store from '../renderer/store/store';
import { Provider } from 'react-redux'
import { LocaleContext } from '../renderer/base/constants/LocaleContext';
import Editor from '../renderer/pages/Editor';
import Home from '../renderer/pages/Home';
import Header from '../renderer/base/components/Header';
import SignIn from '../renderer/pages/SignIn';
import SignUp from '../renderer/pages/SignUp';
import {
    QueryClient,
    QueryClientProvider
} from '@tanstack/react-query';

// react query
const queryClient = new QueryClient()
// root
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
// render
root.render(
    <QueryClientProvider client={queryClient}>
        <Provider store={store}>
            <LocaleContext.Provider value={getLocalizationCfg(navigator.language)}>
            <BrowserRouter>
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route index element={<Home />} />
                    <Route path="edit/:roomId?" element={<Editor />} />
                    <Route path="signin" element={<SignIn />} />
                    <Route path="signup" element={<SignUp />} />
                    <Route path="*" element={<>404</>} />
                </Routes>
            </BrowserRouter>
            </LocaleContext.Provider>
        </Provider>
    </QueryClientProvider>
)
