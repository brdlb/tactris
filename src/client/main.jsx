import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/fonts.css';
import GameBoardMain from './modules/ui/components/GameBoardMain';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GameBoardMain />
    </React.StrictMode>
);
