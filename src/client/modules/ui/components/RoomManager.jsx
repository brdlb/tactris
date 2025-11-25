import React from 'react';

const RoomManager = ({ 
  rooms, 
  onCreateRoom, 
  onJoinRoom, 
  onCreateRoomTouch, 
  onJoinRoomTouch 
}) => {
  return (
    <div className="room-controls">
      <button
        onClick={onCreateRoom}
        onTouchStart={onCreateRoomTouch}
        className="create-room-btn"
      >
        New Room
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
                <button 
                  onClick={() => onJoinRoom(room.id)} 
                  onTouchStart={(e) => onJoinRoomTouch(e, room.id)} 
                  className="join-btn"
                >
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

export default RoomManager;