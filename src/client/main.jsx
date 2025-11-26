import React from 'react';
import ReactDOM from 'react-dom/client';
import GameBoard from './modules/ui/components/GameBoard';
import './styles/fonts.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GameBoard />
    </React.StrictMode>
);
