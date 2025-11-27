const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Game } = require('./models/Game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://tactris.brdlb.com", "http://tactris.brdlb.com"]
      : "*",
    methods: ["GET", "POST"]
  }
});

// Trust proxy when running behind nginx
app.set('trust proxy', 1);

// Serve static files from the client build directory (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const games = new Map();

io.on('connection', (socket) => {

  socket.on('create_room', ({ color }) => {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId);
    game.addPlayer(socket.id, color); // Add creator as player with their color
    games.set(roomId, game);
    socket.join(roomId);
    
    // Send players list to the room creator
    const playersList = game.getPlayersList();
    socket.emit('room_created', { 
      roomId, 
      state: game.getState(),
      playersList 
    });

    // Broadcast updated room list to all clients
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    io.emit('rooms_list', roomList);
  });

  socket.on('join_room', ({ roomId, color }) => {
    if (games.has(roomId)) {
      socket.join(roomId);
      const game = games.get(roomId);
      game.addPlayer(socket.id, color); // Add joiner as player with their color
      
      // Send current players list to the joining user
      const playersList = game.getPlayersList();
      socket.emit('room_joined', { 
        roomId, 
        state: game.getState(),
        playersList 
      });
      
      // Notify other players in the room about new player
      const newPlayerData = { id: socket.id, color, score: 0 };
      socket.to(roomId).emit('player_joined', {
        playerId: socket.id,
        player: newPlayerData
      });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('get_rooms', () => {
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    socket.emit('rooms_list', roomList);
  });

  socket.on('place_pixel', ({ roomId, status, position }) => {
    const game = games.get(roomId);
    if (game) {
      const success = game.placePixel(socket.id, status, position);
      if (success) {
        const gameState = game.getState();
        io.to(roomId).emit('game_update', gameState);
      } else {
        socket.emit('error', 'Invalid move');
      }
    }
  });

  socket.on('place_figure', ({ roomId, pixels }) => {
    const game = games.get(roomId);
    if (game) {
      const success = game.placeFigure(socket.id, pixels, roomId, io);
      if (success) {
        const gameState = game.getState();
        io.to(roomId).emit('game_update', gameState);
        if (game.checkGameOver()) {
          io.to(roomId).emit('game_over');
        }
      } else {
        socket.emit('error', 'Invalid move');
        // Revert client state
        socket.emit('game_update', game.getState());
      }
    }
  });

  socket.on('update_player_color', ({ roomId, color }) => {
    const game = games.get(roomId);
    if (game) {
      const success = game.updatePlayerColor(socket.id, color);
      if (success) {
        // Send updated game state to all players in the room
        const gameState = game.getState();
        const playersList = game.getPlayersList();
        io.to(roomId).emit('game_update', gameState);
        io.to(roomId).emit('players_list_updated', { playersList });
      } else {
        socket.emit('error', 'Player not found in room');
      }
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('disconnect', () => {
    
    // Find all rooms the disconnected user was part of
    const roomsToNotify = [];
    
    for (const [roomId, game] of games.entries()) {
      if (game.removePlayer(socket.id)) {
        roomsToNotify.push(roomId);
        
        // Notify other players in the room about player leaving
        socket.to(roomId).emit('player_left', {
          playerId: socket.id
        });
        
        // If room is empty, remove it
        if (game.players.size === 0) {
          games.delete(roomId);
        } else {
          // Send updated players list to remaining players
          const playersList = game.getPlayersList();
          io.to(roomId).emit('players_list_updated', { playersList });
        }
      }
    }
    
    // Update room list for all clients
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    io.emit('rooms_list', roomList);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});
