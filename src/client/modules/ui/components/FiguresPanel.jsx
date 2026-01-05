import React from 'react';
import { FIGURES } from '../../../constants/figures';
import FigureRenderer from './FigureRenderer';

const FiguresPanel = ({ score, figures, playerColor }) => {

    return (
        <div className="figures-panel">
            <div className="pixel-text" style={{ marginBottom: '10px', fontSize: '16px', lineHeight: '1', fontWeight: 'bold' }}>
                {score}
            </div>
            {figures.length > 0 && (
                <div style={{ display: 'flex' }}>
                    {figures.map((figure, i) => (
                        <div key={i} style={{ marginRight: '10px' }}>
                            <FigureRenderer
                                figure={figure}
                                color={playerColor}
                                cellSize={10}
                                padding={1}
                                margin="5px"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FiguresPanel;
