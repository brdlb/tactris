import React from 'react';
import Panel from './Panel';
import FigureRenderer from './FigureRenderer';

const PlayerPanels = ({ playersList, currentSocketId }) => {
    // Filter out current player and take up to 3 other players
    const otherPlayers = playersList
        .filter(player => player.id !== currentSocketId)
        .slice(0, 3);

    const positions = ['top-right', 'bottom-right', 'bottom-left'];

    return (
        <>
            {otherPlayers.map((player, index) => {
                const position = positions[index] || 'top-right';

                return (
                    <Panel key={player.id} position={position}>
                        <div className="panel-content">
                            <div className="player-info">
                                <div
                                    className="player-color"
                                    style={{ backgroundColor: player.color }}
                                ></div>
                                <div className="player-score">{player.score || 0}</div>
                            </div>
                            {player.figures && player.figures.length > 0 && (
                                <div style={{ display: 'flex', marginTop: '5px' }}>
                                    {player.figures.map((figure, i) => (
                                        <div key={i} style={{ marginRight: '5px' }}>
                                            <FigureRenderer 
                                                figure={figure} 
                                                color={player.color}
                                                cellSize={8}
                                                gap="1px"
                                                margin="2px"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>
                );
            })}
        </>
    );
};

export default PlayerPanels;
 
