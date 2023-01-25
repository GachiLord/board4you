import { createRoot } from 'react-dom/client';
import Board from './view/Board'
import 'bootstrap/dist/css/bootstrap.css'
import React from 'react';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <Board />
);