import React, { useState } from 'react';
import RoomPreview from './RoomPreview';

const RoomControls = ({ rooms, roomStates, onCreateRoom, onJoinRoom, skin = 'classic' }) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [rotateable, setRotateable] = useState(false);
  const emptyGrid = Array.from({ length: 10 }, () => Array(10).fill(null));

  return (
    <div className="lobby-container">
      <div className="create-room-controls">
        <button
          onClick={() => onCreateRoom(rotateable, isPrivate)}
          className="create-room-btn"
        >
          Create Room
        </button>

        <div className="room-options">
          <label className="room-option-label">
            <input
              type="checkbox"
              checked={rotateable}
              onChange={(e) => setRotateable(e.target.checked)}
            />
            <span>Rotateable Figures</span>
          </label>

          <label className="room-option-label">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Private Room</span>
          </label>
        </div>
      </div>

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
