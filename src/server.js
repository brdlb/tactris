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

// Helper function to create a short hash of userId for logging
function shortUserIdHash(userId) {
  if (!userId) return 'unknown';
  return userId.slice(-6); // Take last 6 characters of userId
}
const UserRepository = require('./models/UserRepository');
const SessionRepository = require('./models/SessionRepository');

// Define restore timeout constant
const RESTORE_TIMEOUT_MS = 600000; // 10 minutes in milliseconds

// Import routes and middleware
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
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

// Define public routes that should bypass session validation
// Public endpoint for user statistics - must be defined before global session validation
app.get('/api/user/stats/public', async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log('Received request for user stats with user_id:', shortUserIdHash(user_id));
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id parameter is required' });
    }

    // Get user statistics from the repository
    const stats = await repositoryManager.gameStatistics.findByUserId(user_id);
    
    if (!stats) {
      // If no stats exist for the user, return default stats
      return res.status(200).json({
        user_id: user_id,
        total_games: 0,
        total_score: 0,
        average_score: 0,
        best_score: 0,
        total_lines_cleared: 0,
        average_lines_cleared: 0,
        best_lines_cleared: 0,
        total_figures_placed: 0,
        total_play_time_seconds: 0,
        average_lines_per_game: 0,
        rating: 1000
      });
    }

    // Return formatted statistics
    const responseData = {
      user_id: user_id,
      total_games: stats.total_games,
      total_score: stats.total_score,
      average_score: stats.average_score || 0,
      best_score: stats.best_score,
      total_lines_cleared: stats.total_lines_cleared,
      average_lines_cleared: stats.average_lines_cleared || 0,
      best_lines_cleared: stats.best_lines_cleared,
      total_figures_placed: stats.total_figures_placed || 0,
      total_play_time_seconds: stats.total_play_time_seconds || 0,
      average_lines_per_game: stats.average_lines_per_game || 0,
      rating: stats.rating || 1000
    };
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching public user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Apply session validation middleware to all other routes
app.use(sessionValidation);

// Routes
app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);

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
        })
        .catch(err => {
          console.warn('Warning: Could not update anonymous token (migration may not be run yet):', err);
          // If the column doesn't exist, use the user as-is without the token
          socket.userId = user.id; // Use the database user UUID
          socket.isAnonymous = true;
          socket.anonymousToken = null; // No token available
          socket.anonymousUserRecord = user; // Store the user record as-is
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
const recentlyDisconnected = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of recentlyDisconnected.entries()) {
    if (now - data.timestamp > RESTORE_TIMEOUT_MS) {
      recentlyDisconnected.delete(userId);
    }
  }
}, 60000);
io.on('connection', (socket) => {
  // Send the anonymous token and user_id to the client if they are an anonymous user
  if (socket.anonymousToken && socket.isAnonymous) {
    socket.emit('anonymous_token', { 
      token: socket.anonymousToken,
      user_id: socket.userId 
    });
    
    // Update the last seen timestamp for the user
    repositoryManager.users.updateLastSeen(socket.userId)
      .catch(err => {
        console.error('Error updating last seen timestamp:', err);
      });
  }

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
           duration_seconds: gameInstance.getPlayerDuration ? gameInstance.getPlayerDuration(playerId) : 0,
           lines_cleared: gameInstance.getLinesCleared ? gameInstance.getLinesCleared() : 0,
           figures_placed: gameInstance.getFiguresPlaced ? gameInstance.getFiguresPlaced() : 0,
           score: gameInstance.getScore ? gameInstance.getScore(playerId) : 0,
           game_result: gameInstance.getGameResult ? gameInstance.getGameResult(playerId) : 'completed',
           session_data: JSON.stringify({
             players: Array.from(gameInstance.players.entries()),
             moves: gameInstance.moves || [],
             authenticated_user_id: authenticatedUserId
           })
         };
         
         // Log the data that will be written to the database for debugging
         console.log(`Game completion data for player ${playerId}:`, {
           player_id: authenticatedUserId,
           game_mode: gameSessionData.game_mode,
           grid_width: gameSessionData.grid_width,
           grid_height: gameSessionData.grid_height,
           initial_grid: gameSessionData.initial_grid,
           final_grid: gameSessionData.final_grid,
           duration_seconds: gameSessionData.duration_seconds,
           lines_cleared: gameSessionData.lines_cleared,
           figures_placed: gameSessionData.figures_placed,
           score: gameSessionData.score,
           game_result: gameSessionData.game_result,
           session_data: gameSessionData.session_data
         });
         
         // Use the service to complete the game session with proper transactions
         const result = await gameSessionService.completeGameSessionWithRepositoryMethods(
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
         
         // Log the updated session and statistics
         console.log(`Updated session and statistics for player ${playerId}:`, {
           session: result.session,
           statistics: result.statistics
         });
       } catch (error) {
         console.error(`Error completing game session for player ${playerId}:`, error);
         // Continue processing other players' sessions
       }
     }
   };
 
   // Helper function to complete a single player's game session when they leave a room
   const completePlayerSessionOnLeave = async (roomId, playerId) => {
     const gameInstance = games.get(roomId);
     console.log(`[DIAGNOSTIC] completePlayerSessionOnLeave: checking playerSessions[${playerId.slice(-6)}] = ${!!(gameInstance?.playerSessions?.[playerId])}`);
     if (!gameInstance || !gameInstance.playerSessions || !gameInstance.playerSessions[playerId]) {
       console.warn(`Game instance or player session not found for player ${shortUserIdHash(playerId)} in room ${roomId}`);
       return;
     }
 
     try {
       const sessionId = gameInstance.playerSessions[playerId];
       
       // Get the authenticated user ID for this player (if available)
       const authenticatedUserId = gameInstance.authenticatedUserIds ?
         gameInstance.authenticatedUserIds[playerId] : playerId;
       
       // Prepare game session data for statistics calculation
       const gameSessionData = {
         player_id: authenticatedUserId,
         game_mode: 'classic',
         grid_width: gameInstance.gridWidth,
         grid_height: gameInstance.gridHeight,
         initial_grid: JSON.stringify(gameInstance.getInitialGrid()),
         final_grid: JSON.stringify(gameInstance.grid),
         duration_seconds: gameInstance.getPlayerDuration ? gameInstance.getPlayerDuration(playerId) : 0,
         lines_cleared: gameInstance.getLinesCleared ? gameInstance.getLinesCleared() : 0,
         figures_placed: gameInstance.getFiguresPlaced ? gameInstance.getFiguresPlaced() : 0,
         score: gameInstance.getScore ? gameInstance.getScore(playerId) : 0,
         game_result: gameInstance.gameOver ? gameInstance.getGameResult(playerId) : 'quit', // Use 'quit' if player left before game ended
         session_data: JSON.stringify({
           players: Array.from(gameInstance.players.entries()),
           moves: gameInstance.moves || [],
           authenticated_user_id: authenticatedUserId
         })
       };
       
       // Check if game is not over, and if so, take a snapshot of the player's state
       if (!gameInstance.gameOver) {
         const snapshot = gameInstance.getPlayerState(playerId);
         const updates = {
           final_grid: JSON.stringify(gameInstance.grid),
           duration_seconds: gameSessionData.duration_seconds,
           lines_cleared: gameSessionData.lines_cleared,
           figures_placed: gameSessionData.figures_placed,
           score: gameSessionData.score,
           game_result: 'paused',
           paused_at: new Date().toISOString(),
           player_state: JSON.stringify(snapshot),
           session_data: gameSessionData.session_data
         };
         
         // Update the game session with paused data
         const result = await gameSessionService.completeGameSessionWithRepositoryMethods(
           sessionId,
           updates,
           authenticatedUserId,
           gameSessionData
         );
       } else {
         // Update the game session with final data and update statistics
         const result = await gameSessionService.completeGameSessionWithRepositoryMethods(
           sessionId,
           {
             final_grid: JSON.stringify(gameInstance.grid),
             duration_seconds: gameSessionData.duration_seconds,
             lines_cleared: gameSessionData.lines_cleared,
             figures_placed: gameSessionData.figures_placed,
             score: gameSessionData.score,
             game_result: gameSessionData.game_result, // Set result to 'quit' when player leaves
             session_data: gameSessionData.session_data
           },
           authenticatedUserId,
           gameSessionData
         );
       }
       
       console.log(`Updated session and statistics for player ${shortUserIdHash(authenticatedUserId)} who left room ${roomId}`);

       const afterLeaveSession = await repositoryManager.gameSessions.findById(sessionId);
       console.log(`[DIAGNOSTIC] Session after completePlayerSessionOnLeave (gameOver=${!!gameInstance.gameOver}): game_result='${afterLeaveSession?.game_result || 'null'}', paused_at='${afterLeaveSession?.paused_at || 'null'}'`);
       
     } catch (error) {
       console.error(`Error updating game session and statistics for player ${shortUserIdHash(authenticatedUserId)} who left room ${roomId}:`, error);
     }
   };
 
   // Helper function to create a game session record in the database
   const createGameSession = async (game, playerId, isJoining = false) => {
    try {
      // Get the player's color from the game state or use a default
      const playerColor = game.players.get(playerId)?.color || '#FF000'; // Default to red if color not found
      
      // Ensure the color is in hex format (7 characters max for the database field)
      let formattedColor = playerColor;
      if (playerColor.startsWith('rgb(')) {
        // Convert RGB to hex format
        const rgbValues = playerColor.match(/\d+/g);
        if (rgbValues && rgbValues.length >= 3) {
          const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
          const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
          const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
          formattedColor = `#${r}${g}${b}`;
        }
      } else if (playerColor.length > 7) {
        // If it's a hex color but longer than 7 characters, truncate or validate
        formattedColor = playerColor.substring(0, 7);
      }
      
      const gameSessionData = {
        player_id: socket.userId, // Use the authenticated user ID from socket connection
        room_id: game.id, // Store room ID directly in the table
        player_color: formattedColor, // Use the player's color from the game state (ensured to be in proper format)
        final_score: 0, // Will be updated as game progresses
        lines_cleared: 0, // Will be updated as game progresses
        total_lines_cleared: 0, // Will be updated as game progresses
        figures_placed: 0, // Will be updated as game progresses
        game_duration_seconds: 0, // Will be calculated when game ends
        final_grid: null, // Will be set when game ends
        ending_reason: null, // Will be updated when game ends
        average_time_per_figure: 0, // Will be updated as game progresses
        max_combo: 0, // Will be updated as game progresses
        max_single_game_score: 0 // Will be updated as game progresses
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

  socket.on('create_room', async ({ color, rotateable = false }) => {
      const roomId = Math.random().toString(36).substring(7);
      const game = new Game(roomId, rotateable);
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
        
        // Log the join event
        console.log(`Player ${shortUserIdHash(socket.userId)} joining room ${roomId}`);
        
        // Check for duplicate userId in the game to prevent multiple connections
        if (game.hasActiveUserId(socket.userId)) {
          socket.emit('error', 'User already connected to this room');
          socket.leave(roomId);
          console.log(`Player ${shortUserIdHash(socket.userId)} already in room ${roomId}, connection rejected`);
          return;
        }
        
        console.log(`Attempting to join room ${roomId} for player ${shortUserIdHash(socket.userId)}`);

        // Check memory first for quick reconnect (Memory-First Restore)
        if (recentlyDisconnected.has(socket.userId)) {
          const recentData = recentlyDisconnected.get(socket.userId);
          console.log(`Memory restore candidate found for ${shortUserIdHash(socket.userId)} in room ${roomId}, expected ${recentData.roomId}`);
          if (recentData.roomId === roomId &&
              Date.now() - recentData.timestamp < RESTORE_TIMEOUT_MS &&
              games.has(roomId)) {
            const game = games.get(roomId);
            if (!game.gameOver) {
              console.log(`Memory-restoring player ${shortUserIdHash(socket.userId)} to room ${roomId}`);
              game.addPlayer(socket.id, color, socket.userId, recentData.snapshot);
              recentlyDisconnected.delete(socket.userId);
              const playersList = game.getPlayersList();
              socket.emit('room_joined', {
                roomId,
                state: game.getState(),
                playersList,
                restored: true
              });
              const newPlayerData = { id: socket.id, color, score: recentData.snapshot.score || 0 };
              socket.to(roomId).emit('player_joined_restored', {
                playerId: socket.id,
                player: newPlayerData
              });
              return;
            } else {
              console.log(`Game over, clearing memory snapshot for ${shortUserIdHash(socket.userId)}`);
            }
          }
          recentlyDisconnected.delete(socket.userId);
        }

        // Check for recent paused session to restore (for unexpected disconnections)
        const recentPaused = await repositoryManager.gameSessions.findRestoreCandidate(socket.userId, roomId);
        console.log(`Checking for restore candidate for player ${shortUserIdHash(socket.userId)} in room ${roomId}: ${recentPaused ? 'FOUND' : 'NOT FOUND'}`);
        if (recentPaused && !game.gameOver) {
          const restoreState = recentPaused.player_state || {};
          console.log(`[DEBUG] Restore state loaded directly (jsonb): keys=${Object.keys(restoreState).join(', ') || 'none'}`);
          game.addPlayer(socket.id, color, socket.userId, restoreState);
          
          // Associate restored session with new socket ID
          if (!game.playerSessions) {
            game.playerSessions = {};
          }
          game.playerSessions[socket.id] = recentPaused.id;
          console.log(`[DIAGNOSTIC] Associated restored session ${recentPaused.id} with new socket ${socket.id.slice(-6)}`);
          
          // Update the session to mark it as restored (not paused anymore)
          await repositoryManager.gameSessions.update(recentPaused.id, {
            ending_reason: null,
            paused_at: null
          });
          
          // Send current players list to the joining user with restore flag
          const playersList = game.getPlayersList();
          socket.emit('room_joined', {
            roomId,
            state: game.getState(),
            playersList,
            restored: true
          });
          
          // Notify other players in the room about player joined restored
          const newPlayerData = { id: socket.id, color, score: restoreState.score };
          socket.to(roomId).emit('player_joined_restored', {
            playerId: socket.id,
            player: newPlayerData
          });
          
          console.log(`Returning player ${shortUserIdHash(socket.userId)} restored to room ${roomId}`);
          return; // Exit early after restoration
        }
        
        // Check if player has an existing session in this room that is paused
        const existingSession = await repositoryManager.gameSessions.findByPlayerAndRoom(socket.userId, roomId);
        if (existingSession && existingSession.game_result === 'paused') {
          // Player has a paused session, restore it
          try {
            const restoreState = JSON.parse(existingSession.player_state);
            game.addPlayer(socket.id, color, socket.userId, restoreState);
            
            // Associate restored session with new socket ID
            if (!game.playerSessions) {
              game.playerSessions = {};
            }
            game.playerSessions[socket.id] = existingSession.id;
            console.log(`[DIAGNOSTIC] Associated existing paused session ${existingSession.id} with new socket ${socket.id.slice(-6)}`);
            
            // Update the session to mark it as restored (not paused anymore)
            await repositoryManager.gameSessions.update(existingSession.id, {
              ending_reason: null,
              paused_at: null
            });
            
            // Send current players list to the joining user with restore flag
            const playersList = game.getPlayersList();
            socket.emit('room_joined', {
              roomId,
              state: game.getState(),
              playersList,
              restored: true
            });
            
            // Notify other players in the room about player joined restored
            const newPlayerData = { id: socket.id, color, score: restoreState.score };
            socket.to(roomId).emit('player_joined_restored', {
              playerId: socket.id,
              player: newPlayerData
            });
            
            console.log(`Returning player ${shortUserIdHash(socket.userId)} restored paused session in room ${roomId}`);
            return; // Exit early after restoration
          } catch (error) {
            console.error(`Error restoring paused session for player ${shortUserIdHash(socket.userId)} in room ${roomId}:`, error);
          }
        }
        
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
        
        console.log(`New player ${shortUserIdHash(socket.userId)} joined room ${roomId}`);
      } else {
        socket.emit('error', 'Room not found');
        console.log(`Player ${shortUserIdHash(socket.userId)} attempted to join non-existent room ${roomId}`);
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

  // Function to handle player leaving a room (both intentional and due to disconnect)
  const handlePlayerLeave = async (roomId) => {
    const game = games.get(roomId);
    if (game && game.players.has(socket.id)) {
      console.log(`Player ${shortUserIdHash(socket.userId)} leaving room ${roomId}`);

      // Immediately snapshot player state to memory for quick reconnect
      const snapshot = game.getPlayerState(socket.id);
      recentlyDisconnected.set(socket.userId, {
        roomId,
        snapshot,
        timestamp: Date.now()
      });

      // Clear active flag early (userIdToSocket.delete)
      game.userIdToSocket.delete(socket.userId);

      // Update the game session and statistics for the leaving player BEFORE removing them
      // The completePlayerSessionOnLeave function already handles pause vs complete logic based on game state
      try {
        await completePlayerSessionOnLeave(roomId, socket.id);
      } catch (error) {
        console.error(`Error completing player session on leave:`, error);
        return; // Don't clear snapshot or removePlayer on failure
      }
      // Now remove the player from the game
      game.removePlayer(socket.id);

      // Clear memory snapshot on successful disconnect handling
      recentlyDisconnected.delete(socket.userId);

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

            const abandonedSession = await repositoryManager.gameSessions.findById(game.playerSessions[socket.id]);
            console.log(`[DIAGNOSTIC] Session after empty room abandoned override: game_result='${abandonedSession?.game_result || 'null'}', paused_at='${abandonedSession?.paused_at || 'null'}'`);
          } catch (error) {
            console.error(`Error updating game session for abandoned game (player ${socket.id}):`, error);
          }
        }
      }
      
      // Notify other players in the room about player leaving
      socket.to(roomId).emit('player_left', {
        playerId: socket.id
      });
      
      // Send updated players list to remaining players
      const playersList = game.getPlayersList();
      io.to(roomId).emit('players_list_updated', { playersList });
    }
  };

  // Handle intentional room leaving
  socket.on('leave_room', async ({ roomId }) => {
    console.log(`Player ${shortUserIdHash(socket.userId)} intentionally leaving room ${roomId}`);
    await handlePlayerLeave(roomId);
    
    // Update room list for all clients
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    io.emit('rooms_list', roomList);
  });

  socket.on('disconnect', async () => {
    
    // Find all rooms the disconnected user was part of
    const roomsToNotify = [];
    
    for (const [roomId, game] of games.entries()) {
      if (game.players.has(socket.id)) {
        roomsToNotify.push(roomId);
        await handlePlayerLeave(roomId);
      }
    }
    
    if (roomsToNotify.length > 0) {
      console.log(`Player ${shortUserIdHash(socket.userId)} disconnected from ${roomsToNotify.length} room(s)`);
    } else {
      console.log(`Player ${shortUserIdHash(socket.userId)} disconnected (was not in any rooms)`);
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
