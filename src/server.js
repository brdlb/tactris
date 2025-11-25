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
  console.log('User connected:', socket.id);

  socket.on('create_room', () => {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId);
    game.addPlayer(socket.id); // Add creator as player
    games.set(roomId, game);
    socket.join(roomId);
    socket.emit('room_created', { roomId, state: game.getState() });
    console.log(`Room created: ${roomId}`);

    // Broadcast updated room list to all clients
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    io.emit('rooms_list', roomList);
  });

  socket.on('join_room', (roomId) => {
    if (games.has(roomId)) {
      socket.join(roomId);
      const game = games.get(roomId);
      game.addPlayer(socket.id); // Add joiner as player
      socket.emit('room_joined', { roomId, state: game.getState() });
      console.log(`User ${socket.id} joined room ${roomId}`);
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
        io.to(roomId).emit('game_update', game.getState());
      } else {
        socket.emit('error', 'Invalid move');
      }
    }
  });

  socket.on('place_figure', ({ roomId, pixels }) => {
    console.log(`User ${socket.id} placed figure in room ${roomId} with ${pixels.length} pixels`);
    const game = games.get(roomId);
    if (game) {
      const success = game.placeFigure(socket.id, pixels);
      if (success) {
        io.to(roomId).emit('game_update', game.getState());
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
