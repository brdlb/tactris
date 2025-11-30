import React from 'react';
import './GameBoard.css';

const RoomControls = ({ rooms, onCreateRoom, onJoinRoom }) => {
    return (
        <div className="room-controls">
            <button
                onClick={() => onCreateRoom()}
                className="create-room-btn"
            >
                Create Room
            </button>
            <div className="rooms-list">
                <h3>Available Rooms:</h3>
                {rooms.length === 0 ? (
                    <p>No rooms available</p>
                ) : (
                    <ul>
                        {rooms.map(room => (
                            <li key={room.id}>
                                {room.id}
                                <button onClick={() => onJoinRoom(room.id)} className="join-btn">
                                    Join
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default RoomControls;
