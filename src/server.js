require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Game } = require('./models/Game');
const { pool, query, healthCheck, closePool, repositoryManager } = require('./config/db');
const GameSessionService = require('./services/GameSessionService');

// Initialize the GameSessionService with repositories
const gameSessionService = new GameSessionService(
  repositoryManager.gameSessions,
  repositoryManager.gameStatistics
);

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

  socket.on('create_room', async ({ color }) => {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId);
    game.addPlayer(socket.id, color); // Add creator as player with their color
    
    // Create a game session record in the database for the creator
    try {
      const gameSessionData = {
        user_id: socket.id, // This would need to be the actual user ID from authentication
        opponent_id: null, // Will be set when another player joins
        game_mode: 'classic', // Default game mode
        grid_width: game.gridWidth,
        grid_height: game.gridHeight,
        initial_grid: JSON.stringify(game.getInitialGrid()),
        final_grid: null, // Will be set when game ends
        duration_seconds: 0, // Will be calculated when game ends
        lines_cleared: 0, // Will be updated as game progresses
        figures_placed: 0, // Will be updated as game progresses
        score: 0, // Will be updated as game progresses
        game_result: 'in_progress', // Will be updated when game ends
        session_data: JSON.stringify({
          players: Array.from(game.players.entries()),
          moves: []
        })
      };
      
      // Create the game session in the database
      const createdSession = await repositoryManager.gameSessions.create(gameSessionData);
      
      // Store the session ID in the game instance for this player
      if (!game.playerSessions) {
        game.playerSessions = {};
      }
      game.playerSessions[socket.id] = createdSession.id;
    } catch (error) {
      console.error('Error creating game session:', error);
      // Continue with the game creation even if session creation fails
    }
    
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

  socket.on('join_room', async ({ roomId, color }) => {
    if (games.has(roomId)) {
      socket.join(roomId);
      const game = games.get(roomId);
      game.addPlayer(socket.id, color); // Add joiner as player with their color
      
      // Create a game session record in the database for the joining player
      try {
        const gameSessionData = {
          user_id: socket.id, // This would need to be the actual user ID from authentication
          opponent_id: null, // Will be set after we know the opponent
          game_mode: 'classic', // Default game mode
          grid_width: game.gridWidth,
          grid_height: game.gridHeight,
          initial_grid: JSON.stringify(game.getInitialGrid()),
          final_grid: null, // Will be set when game ends
          duration_seconds: 0, // Will be calculated when game ends
          lines_cleared: 0, // Will be updated as game progresses
          figures_placed: 0, // Will be updated as game progresses
          score: 0, // Will be updated as game progresses
          game_result: 'in_progress', // Will be updated when game ends
          session_data: JSON.stringify({
            players: Array.from(game.players.entries()),
            moves: []
          })
        };
        
        // Create the game session in the database
        const createdSession = await repositoryManager.gameSessions.create(gameSessionData);
        
        // Store the session ID in the game instance for this player
        if (!game.playerSessions) {
          game.playerSessions = {};
        }
        game.playerSessions[socket.id] = createdSession.id;
        
        // Update the opponent_id in the game sessions for both players
        if (game.players.size === 2) { // Now we have 2 players
          // Find the other player in the game
          const players = Array.from(game.players.keys());
          const otherPlayerId = players.find(id => id !== socket.id);
          
          // Update both players' game sessions with each other as opponents
          if (otherPlayerId && game.playerSessions[otherPlayerId] && game.playerSessions[socket.id]) {
            // Update the existing player's session to have the new player as opponent
            await repositoryManager.gameSessions.update(game.playerSessions[otherPlayerId], {
              opponent_id: socket.id
            });
            
            // Update the joining player's session to have the existing player as opponent
            await repositoryManager.gameSessions.update(game.playerSessions[socket.id], {
              opponent_id: otherPlayerId
            });
          }
        }
      } catch (error) {
        console.error('Error creating game session for joining player:', error);
        // Continue with the game joining even if session creation fails
      }
      
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

  socket.on('place_figure', async ({ roomId, pixels }) => {
    const game = games.get(roomId);
    if (game) {
      const success = game.placeFigure(socket.id, pixels, roomId, io);
      if (success) {
        const gameState = game.getState();
        io.to(roomId).emit('game_update', gameState);
        if (game.checkGameOver()) {
          // Handle game completion with transaction for each player
          const gameInstance = games.get(roomId);
          if (gameInstance && gameInstance.playerSessions) {
            // Process each player's game session
            for (const [playerId, sessionId] of Object.entries(gameInstance.playerSessions)) {
              try {
                // Prepare game session data for storage
                const gameSessionData = {
                  user_id: playerId, // Use the specific player's ID
                  opponent_id: Array.from(gameInstance.players.keys()).find(id => id !== playerId) || null,
                  game_mode: 'classic', // This would need to be determined based on the game mode
                  grid_width: gameInstance.gridWidth,
                  grid_height: gameInstance.gridHeight,
                  initial_grid: JSON.stringify(gameInstance.getInitialGrid()),
                  final_grid: JSON.stringify(gameInstance.grid),
                  duration_seconds: gameInstance.getDuration ? gameInstance.getDuration() : 0,
                  lines_cleared: gameInstance.getLinesCleared ? gameInstance.getLinesCleared() : 0,
                  figures_placed: gameInstance.getFiguresPlaced ? gameInstance.getFiguresPlaced() : 0,
                  score: gameInstance.getScore ? gameInstance.getScore(playerId) : 0,
                  game_result: gameInstance.getGameResult ? gameInstance.getGameResult(playerId) : 'unknown',
                  session_data: JSON.stringify({
                    players: Array.from(gameInstance.players.entries()),
                    moves: gameInstance.moves || []
                  })
                };
                
                // Update this when we have proper user authentication
                // For now, using playerId as a placeholder for user_id
                
                // Use the service to complete the game session with proper transactions
                await gameSessionService.completeGameSessionWithRepositoryMethods(
                  sessionId, // Use the player's specific session ID
                  {
                    final_grid: JSON.stringify(gameInstance.grid),
                    duration_seconds: gameSessionData.duration_seconds,
                    lines_cleared: gameSessionData.lines_cleared,
                    figures_placed: gameSessionData.figures_placed,
                    score: gameSessionData.score,
                    game_result: gameSessionData.game_result,
                    session_data: gameSessionData.session_data
                  },
                  playerId, // The user ID for statistics update
                  gameSessionData
                );
              } catch (error) {
                console.error(`Error completing game session for player ${playerId}:`, error);
                // Continue processing other players' sessions
              }
            }
          } else {
            console.warn('Game instance or player sessions not found for game completion');
          }
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

  socket.on('restart_game', async ({ roomId }) => {
    const game = games.get(roomId);
    if (game) {
      // Before restarting, we should consider creating a new game session or updating the existing one
      // For now, we'll just restart the game instance
      game.restart();
      
      // Update all player game sessions to reflect the restart (mark as in progress again)
      if (game.playerSessions) {
        for (const [playerId, sessionId] of Object.entries(game.playerSessions)) {
          try {
            await repositoryManager.gameSessions.update(sessionId, {
              final_grid: JSON.stringify(game.getInitialGrid()), // Reset to initial grid
              duration_seconds: 0,
              lines_cleared: 0,
              figures_placed: 0,
              game_result: 'in_progress'
            });
          } catch (error) {
            console.error(`Error updating game session for restart (player ${playerId}):`, error);
          }
        }
      }
      
      // Send updated game state to all players in the room
      const gameState = game.getState();
      const playersList = game.getPlayersList();
      io.to(roomId).emit('game_update', gameState);
      io.to(roomId).emit('players_list_updated', { playersList });
      io.to(roomId).emit('game_restarted');
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('disconnect', async () => {
    
    // Find all rooms the disconnected user was part of
    const roomsToNotify = [];
    
    for (const [roomId, game] of games.entries()) {
      if (game.removePlayer(socket.id)) {
        roomsToNotify.push(roomId);
        
        // If the game was in progress and a player disconnected, we might want to update the game session
        if (!game.gameOver && game.players.size > 0) {
          // Consider the disconnected player as having left/forfeited
          // For now, we'll just continue the game with remaining players
        } else if (game.players.size === 0) {
          // If room is empty, remove it and potentially mark game as abandoned
          if (game.playerSessions && game.playerSessions[socket.id]) {
            try {
              await repositoryManager.gameSessions.update(game.playerSessions[socket.id], {
                game_result: 'abandoned'
              });
            } catch (error) {
              console.error(`Error updating game session for abandoned game (player ${socket.id}):`, error);
            }
          }
        }
        
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

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Start the server after checking database connection
const startServer = async () => {
  try {
    // Perform database health check
    const dbHealth = await healthCheck();
    if (dbHealth.status === 'error') {
      console.error('Database connection failed:', dbHealth.message);
      process.exit(1);
    }
    console.log('Database connection successful');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database connection pool initialized');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
