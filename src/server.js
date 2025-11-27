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

  socket.on('create_room', ({ color }) => {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId);
    game.addPlayer(socket.id, color); // Add creator as player with their color
    games.set(roomId, game);
    socket.join(roomId);
    
    // Send players list to the room creator
    const playersList = game.getPlayersList();
    console.log(`[SERVER] room_created:`, {
      roomId,
      playersCount: playersList.length,
      playersData: playersList.map(p => ({
        id: p.id.substring(0, 8),
        color: p.color,
        score: p.score,
        figuresCount: p.figures?.length || 0,
        figuresTypes: p.figures?.map(f => f.type) || []
      })),
      timestamp: new Date().toISOString()
    });
    socket.emit('room_created', { 
      roomId, 
      state: game.getState(),
      playersList 
    });
    
    console.log(`Room created: ${roomId}`);

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
      console.log(`[SERVER] room_joined:`, {
        roomId,
        playersCount: playersList.length,
        playersData: playersList.map(p => ({
          id: p.id.substring(0, 8),
          color: p.color,
          score: p.score,
          figuresCount: p.figures?.length || 0,
          figuresTypes: p.figures?.map(f => f.type) || []
        })),
        timestamp: new Date().toISOString()
      });
      socket.emit('room_joined', { 
        roomId, 
        state: game.getState(),
        playersList 
      });
      
      // Notify other players in the room about new player
      const newPlayerData = { id: socket.id, color, score: 0 };
      console.log(`[SERVER] player_joined notification:`, {
        roomId,
        newPlayer: {
          id: socket.id.substring(0, 8),
          color,
          score: 0
        },
        timestamp: new Date().toISOString()
      });
      socket.to(roomId).emit('player_joined', {
        playerId: socket.id,
        player: newPlayerData
      });
      
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
        const gameState = game.getState();
        console.log(`[SERVER] game_update after place_pixel:`, {
          roomId,
          playerCount: Object.keys(gameState.players).length,
          playerData: Object.entries(gameState.players).map(([id, player]) => ({
            id: id.substring(0, 8),
            score: player.score,
            figuresCount: player.figures?.length || 0,
            figuresTypes: player.figures?.map(f => f.type) || []
          })),
          timestamp: new Date().toISOString()
        });
        io.to(roomId).emit('game_update', gameState);
      } else {
        socket.emit('error', 'Invalid move');
      }
    }
  });

  socket.on('place_figure', ({ roomId, pixels }) => {
    console.log(`User ${socket.id} placed figure in room ${roomId} with ${pixels.length} pixels`);
    const game = games.get(roomId);
    if (game) {
      const success = game.placeFigure(socket.id, pixels, roomId, io);
      if (success) {
        const gameState = game.getState();
        console.log(`[SERVER] game_update after place_figure:`, {
          roomId,
          playerCount: Object.keys(gameState.players).length,
          playerData: Object.entries(gameState.players).map(([id, player]) => ({
            id: id.substring(0, 8),
            score: player.score,
            figuresCount: player.figures?.length || 0,
            figuresTypes: player.figures?.map(f => f.type) || []
          })),
          timestamp: new Date().toISOString()
        });
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
    console.log(`[SERVER] User ${socket.id} updating color in room ${roomId} to ${color}`);
    const game = games.get(roomId);
    if (game) {
      const success = game.updatePlayerColor(socket.id, color);
      if (success) {
        // Send updated game state to all players in the room
        const gameState = game.getState();
        const playersList = game.getPlayersList();
        console.log(`[SERVER] player_color_updated:`, {
          roomId,
          playerId: socket.id.substring(0, 8),
          newColor: color,
          playersCount: playersList.length,
          timestamp: new Date().toISOString()
        });
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
    console.log('User disconnected:', socket.id);
    
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
          console.log(`Room ${roomId} deleted - no players left`);
        } else {
          // Send updated players list to remaining players
          const playersList = game.getPlayersList();
          console.log(`[SERVER] players_list_updated:`, {
            roomId,
            playersCount: playersList.length,
            playersData: playersList.map(p => ({
              id: p.id.substring(0, 8),
              color: p.color,
              score: p.score,
              figuresCount: p.figures?.length || 0,
              figuresTypes: p.figures?.map(f => f.type) || []
            })),
            timestamp: new Date().toISOString()
          });
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
