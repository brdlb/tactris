/**
 * Game Session Helper - Helper functions for working with game sessions in the database
 */

const { shortUserIdHash } = require('../utils/socketUtils');

class GameSessionHelper {
  constructor(gameSessionService, repositoryManager) {
    this.gameSessionService = gameSessionService;
    this.repositoryManager = repositoryManager;
  }

  /**
   * Create a game session record in the database
   * @param {Game} game - Game instance
   * @param {string} playerId - Socket ID of the player
   * @param {string} userId - Authenticated user ID
   * @param {boolean} isJoining - Whether this is a joining player or creator
   */
  async createGameSession(game, playerId, userId, isJoining = false) {
    try {
      // Get the player's color from the game state or use a default
      const playerColor = game.players.get(playerId)?.color || '#FF0000'; // Default to red if color not found
      
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
        player_id: userId, // Use the authenticated user ID from socket connection
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
      const createdSession = await this.repositoryManager.gameSessions.create(gameSessionData);
      
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
  }

  /**
   * Complete game sessions for all players in a room
   * @param {string} roomId - Room identifier
   * @param {Game} gameInstance - Game instance
   */
  async completeAllPlayerSessions(roomId, gameInstance) {
    if (!gameInstance || !gameInstance.playerSessions) {
      console.warn('Game instance or player sessions not found for game completion');
      return;
    }

    // Process each player's game session
    for (const [playerId, sessionId] of Object.entries(gameInstance.playerSessions)) {
      try {
        // Get the authenticated user ID for this player (if available)
console.log(`[DEBUG-completeAllPlayerSessions] playerId=${playerId.slice(-8)}, gameInstance.authenticatedUserIds exists: ${!!gameInstance.authenticatedUserIds}, has[playerId]: ${!!(gameInstance.authenticatedUserIds && gameInstance.authenticatedUserIds[playerId])}, value: ${gameInstance.authenticatedUserIds?.[playerId] || 'UNDEFINED'}`);
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
        const result = await this.gameSessionService.completeGameSessionWithRepositoryMethods(
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
  }

  /**
   * Complete a single player's game session when they leave a room
   * @param {string} roomId - Room identifier
   * @param {string} playerId - Socket ID of the player
   * @param {Game} gameInstance - Game instance
   */
  async completePlayerSessionOnLeave(roomId, playerId, gameInstance) {
    console.log(`[DIAGNOSTIC] completePlayerSessionOnLeave: checking playerSessions[${playerId.slice(-6)}] = ${!!(gameInstance?.playerSessions?.[playerId])}`);
    if (!gameInstance || !gameInstance.playerSessions || !gameInstance.playerSessions[playerId]) {
      console.warn(`Game instance or player session not found for player ${shortUserIdHash(playerId)} in room ${roomId}`);
      return;
    }

    try {
      const sessionId = gameInstance.playerSessions[playerId];
      
      console.log(`[DIAG] About to fetch authenticatedUserId. gameInstance.authenticatedUserIds exists: ${!!gameInstance.authenticatedUserIds}, is object: ${typeof gameInstance.authenticatedUserIds === 'object'}, playerId.slice(-6): ${playerId.slice(-6)}`);
      
      // Get the authenticated user ID for this player (if available)
      let authenticatedUserId = playerId; // safe fallback
      if (gameInstance.authenticatedUserIds && typeof gameInstance.authenticatedUserIds === 'object') {
        authenticatedUserId = gameInstance.authenticatedUserIds[playerId] || playerId;
        console.log(`[DIAG] authenticatedUserId resolved to: ${typeof authenticatedUserId} ${shortUserIdHash(authenticatedUserId)}`);
      } else {
        console.warn(`[DIAG] gameInstance.authenticatedUserIds invalid type: ${typeof gameInstance.authenticatedUserIds}`);
      }
      
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
        const result = await this.gameSessionService.completeGameSessionWithRepositoryMethods(
          sessionId,
          updates,
          authenticatedUserId,
          gameSessionData
        );
      } else {
        // Update the game session with final data and update statistics
        const result = await this.gameSessionService.completeGameSessionWithRepositoryMethods(
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

      const afterLeaveSession = await this.repositoryManager.gameSessions.findById(sessionId);
      console.log(`[DIAGNOSTIC] Session after completePlayerSessionOnLeave (gameOver=${!!gameInstance.gameOver}): game_result='${afterLeaveSession?.game_result || 'null'}', paused_at='${afterLeaveSession?.paused_at || 'null'}'`);
      
    } catch (error) {
      console.error(`[DIAG] Inner error details in completePlayerSessionOnLeave - playerId.slice(-6): ${playerId.slice(-6)}, room: ${roomId}:`, error);
      console.error(`Error updating game session and statistics for player ${shortUserIdHash(playerId)} who left room ${roomId}`);
    }
  }

  /**
   * Reset game sessions when a game is restarted
   * @param {Game} gameInstance - Game instance
   */
  async resetGameSessionsOnRestart(gameInstance) {
    if (!gameInstance || !gameInstance.playerSessions) {
      return;
    }

    for (const [playerId, sessionId] of Object.entries(gameInstance.playerSessions)) {
      try {
        await this.repositoryManager.gameSessions.update(sessionId, {
          final_grid: JSON.stringify(gameInstance.getInitialGrid()), // Reset to initial grid
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
}

module.exports = GameSessionHelper;

