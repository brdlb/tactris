import React from 'react';
import { FIGURES } from '../../../constants/figures';
import FigureRenderer from './FigureRenderer';

const FiguresPanel = ({ score, figures, playerColor }) => {

    return (
        <div className="figures-panel">
            <div style={{ marginBottom: '10px', fontSize: '1.2em', fontWeight: 'bold' }}>
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
                                gap="1px"
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
