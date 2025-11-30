import React from 'react';
import ReactDOM from 'react-dom/client';
import GameBoard from './modules/ui/components/GameBoard';
import './styles/fonts.css';
import GameBoardMain from './modules/ui/components/GameBoardMain';
import './modules/ui/components/GameBoard.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GameBoardMain />
    </React.StrictMode>
);
