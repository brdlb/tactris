require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { Game } = require('./models/Game');
const { pool, query, healthCheck, closePool, repositoryManager } = require('./config/db');
const GameSessionService = require('./services/GameSessionService');
const crypto = require('crypto');
const AuthService = require('./services/AuthService');
const UserRepository = require('./models/UserRepository');
const SessionRepository = require('./models/SessionRepository');

// Import authentication routes and middleware
const authRoutes = require('./routes/auth');
const { sessionValidation } = require('./middleware/sessionValidation');

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

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'tactris_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Apply session validation middleware to all routes
app.use(sessionValidation);

// Routes
app.use('/auth', authRoutes);

// Serve static files from the client build directory (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Function to generate a secure anonymous token
function generateAnonymousToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to create a new anonymous user
function createNewAnonymousUser(socket, next) {
  repositoryManager.users.createAnonymous()
    .then(user => {
      // Generate an anonymous token for this user
      const anonymousToken = generateAnonymousToken();
      
      // Update the user record with the anonymous token
      return repositoryManager.users.updateAnonymousToken(user.id, anonymousToken)
        .then(updatedUser => {
          socket.userId = updatedUser.id; // Use the database user UUID
          socket.isAnonymous = true;
          socket.anonymousToken = anonymousToken; // Store the token for sending to client
          socket.anonymousUserRecord = updatedUser; // Store the user record for potential later use
          return next();
        });
    })
    .catch(err => {
      console.error('Error creating anonymous user:', err);
      // Fallback to socket ID if user creation fails
      socket.userId = socket.id;
      socket.isAnonymous = true;
      socket.anonymousToken = null;
      return next();
    });
}

// Middleware to authenticate socket connections
io.use((socket, next) => {
  // Extract session token from handshake auth or headers
  const sessionToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  const anonymousToken = socket.handshake.auth?.anonymousToken || socket.handshake.headers?.['x-anonymous-token'];
  
  // Check if the anonymous token is provided and valid
  if (anonymousToken) {
    // Validate the anonymous token by looking it up in the database
    repositoryManager.users.findByAnonymousToken(anonymousToken)
      .then(user => {
        if (user) {
          // Valid anonymous token found, use existing user
          socket.userId = user.id;
          socket.isAnonymous = true;
          socket.anonymousToken = anonymousToken; // Store the token for later use
          return next();
        } else {
          // Invalid token, create a new anonymous user
          createNewAnonymousUser(socket, next);
        }
      })
      .catch(err => {
        console.error('Error validating anonymous token:', err);
        // If there's an error validating the token, create a new anonymous user
        createNewAnonymousUser(socket, next);
      });
  } else if (!sessionToken) {
    // No session token and no anonymous token provided, create a new anonymous user
    createNewAnonymousUser(socket, next);
  } else {
    // Validate the session token using our auth service
    const authService = new AuthService(repositoryManager.users, repositoryManager.sessions);
    authService.validateSession(sessionToken)
      .then(session => {
        if (session) {
          socket.userId = session.user_id;
          socket.isAnonymous = false;
          next();
        } else {
          // Invalid session, create an anonymous user
          createNewAnonymousUser(socket, next);
        }
      })
      .catch(err => {
        // Error validating session, create an anonymous user
        createNewAnonymousUser(socket, next);
      });
  }
});

const games = new Map();

io.on('connection', (socket) => {
  // Send the anonymous token to the client if they are an anonymous user
  if (socket.anonymousToken && socket.isAnonymous) {
    socket.emit('anonymous_token', { token: socket.anonymousToken });
    
    // Update the last seen timestamp for the user
    repositoryManager.users.updateLastSeen(socket.userId)
      .catch(err => {
        console.error('Error updating last seen timestamp:', err);
      });
  }

 // Helper function to create a game session record in the database
  const createGameSession = async (game, playerId, isJoining = false) => {
    try {
      const gameSessionData = {
        player_id: socket.userId, // Use the authenticated user ID from socket connection
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
          moves: [],
          is_anonymous: socket.isAnonymous
        })
      };
      
      // Create the game session in the database
      const createdSession = await repositoryManager.gameSessions.create(gameSessionData);
      
      // Store the session ID in the game instance for this player
      if (!game.playerSessions) {
        game.playerSessions = {};
      }
      game.playerSessions[playerId] = createdSession.id;
      
      // If this is a joining player and we now have 2 players, update opponent IDs
      if (isJoining && game.players.size === 2) {
        // Find the other player in the game
        const players = Array.from(game.players.keys());
        const otherPlayerId = players.find(id => id !== playerId);
        
        // Update both players' game sessions with each other as opponents
        if (otherPlayerId && game.playerSessions[otherPlayerId] && game.playerSessions[playerId]) {
          // Update the existing player's session to have the new player as opponent
          // Note: opponent_id column doesn't exist in the current schema, so this functionality is not supported
          
          // Update the joining player's session to have the existing player as opponent
          // Note: opponent_id column doesn't exist in the current schema, so this functionality is not supported
        }
      }
    } catch (error) {
      console.error(`Error creating game session for player ${playerId}:`, error);
      // Continue with the game creation even if session creation fails
    }
  };

  socket.on('create_room', async ({ color }) => {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId);
    game.addPlayer(socket.id, color, socket.userId); // Add creator as player with their color and authenticated user ID
    
    // Create a game session record in the database for the creator
    await createGameSession(game, socket.id, false);
    
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
      game.addPlayer(socket.id, color, socket.userId); // Add joiner as player with their color and authenticated user ID
      
      // Create a game session record in the database for the joining player
      await createGameSession(game, socket.id, true);
      
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

  // Helper function to complete game sessions for all players
    const completeGameSessions = async (roomId) => {
      const gameInstance = games.get(roomId);
      if (!gameInstance || !gameInstance.playerSessions) {
        console.warn('Game instance or player sessions not found for game completion');
        return;
      }
  
      // Process each player's game session
      for (const [playerId, sessionId] of Object.entries(gameInstance.playerSessions)) {
        try {
          // Get the authenticated user ID for this player (if available)
          const authenticatedUserId = gameInstance.authenticatedUserIds ?
            gameInstance.authenticatedUserIds[playerId] : playerId;
          
          const opponentId = Array.from(gameInstance.players.keys()).find(id => id !== playerId) || null;
          
          const gameSessionData = {
            player_id: authenticatedUserId,
            game_mode: 'classic',
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
              moves: gameInstance.moves || [],
              authenticated_user_id: authenticatedUserId
            })
          };
          
          // Use the service to complete the game session with proper transactions
          await gameSessionService.completeGameSessionWithRepositoryMethods(
            sessionId,
            {
              final_grid: JSON.stringify(gameInstance.grid),
              duration_seconds: gameSessionData.duration_seconds,
              lines_cleared: gameSessionData.lines_cleared,
              figures_placed: gameSessionData.figures_placed,
              score: gameSessionData.score,
              game_result: gameSessionData.game_result,
              session_data: gameSessionData.session_data
            },
            authenticatedUserId,
            gameSessionData
          );
        } catch (error) {
          console.error(`Error completing game session for player ${playerId}:`, error);
          // Continue processing other players' sessions
        }
      }
    };
  
    socket.on('place_figure', async ({ roomId, pixels }) => {
      const game = games.get(roomId);
      if (game) {
        const success = game.placeFigure(socket.id, pixels, roomId, io);
        if (success) {
          const gameState = game.getState();
          io.to(roomId).emit('game_update', gameState);
          if (game.checkGameOver()) {
            await completeGameSessions(roomId);
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

// Initialize repositories and auth service for cleanup
const authServiceForCleanup = new AuthService(repositoryManager.users, repositoryManager.sessions);

// Function to perform periodic cleanup
const performPeriodicCleanup = async () => {
  try {
    const cleanupResult = await authServiceForCleanup.performCleanup();
    console.log(`Periodic cleanup completed: ${cleanupResult.expiredSessionsRemoved} expired sessions removed, ${cleanupResult.oldAnonymousUsersRemoved} old anonymous users removed`);
  } catch (error) {
    console.error('Error during periodic cleanup:', error);
  }
};

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

    // Fetch and display current user data
    try {
      const users = await repositoryManager.users.getAllUsers();
      console.log(`\nCurrent users in database: ${users.length}`);
      console.log('User data:');
      users.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Anonymous: ${user.is_anonymous}, Created: ${user.created_at}`);
      });
    } catch (error) {
      console.error('Error fetching user data during initialization:', error);
    }

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database connection pool initialized');
    });

    // Perform cleanup once at server startup
    setTimeout(performPeriodicCleanup, 30000); // 30 seconds after startup
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
