import React from 'react';
import RoomPreview from './RoomPreview';

const RoomControls = ({ rooms, roomStates, onCreateRoom, onJoinRoom, skin = 'classic' }) => {
  const emptyGrid = Array.from({ length: 10 }, () => Array(10).fill(null));

  return (
    <div className="lobby-container">
      <button
        onClick={() => onCreateRoom()}
        className="create-room-btn"
      >
        Create Room
      </button>

      <div className="lobby-rooms-grid">
        {rooms.length === 0 ? (
          <p className="no-rooms-message">No rooms available</p>
        ) : (
          rooms.map(room => {
            const roomState = roomStates[room.id] || { grid: emptyGrid, players: [] };
            const grid = roomState.grid || emptyGrid;
            const players = roomState.players || [];

            return (
              <div key={room.id} className="lobby-room-card">
                <button
                  onClick={() => onJoinRoom(room.id)}
                  className="lobby-room-grid-button"
                >
                  {players.map((player, idx) => {
                    let positionClass = '';
                    switch (idx % 4) {
                      case 0: positionClass = 'lobby-player-top-left'; break;
                      case 1: positionClass = 'lobby-player-top-right'; break;
                      case 2: positionClass = 'lobby-player-bottom-right'; break;
                      case 3: positionClass = 'lobby-player-bottom-left'; break;
                      default: positionClass = 'lobby-player-top-left';
                    }
                    return (
                      <div
                        key={idx}
                        className={`lobby-player-indicator ${positionClass}`}
                        style={{ backgroundColor: player.color }}
                        title={`Player ${idx + 1}: ${player.color}`}
                      />
                    );
                  })}
                  <RoomPreview grid={grid} skin={skin} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoomControls;
