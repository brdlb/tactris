/**
 * Game Session Helper - Helper functions for saving game results to database
 * 
 * SIMPLIFIED ARCHITECTURE:
 * - Session state for reconnection is kept IN MEMORY ONLY
 * - Database records are created ONLY when game ends (Game Over)
 * - Each completed game = new record in game_sessions
 */

const { shortUserIdHash } = require('../utils/socketUtils');

/**
 * Convert color to hex format (max 7 chars for DB)
 * @param {string} color - Color in any format
 * @returns {string} Color in #RRGGBB format
 */
function toHexColor(color) {
  if (!color) return '#FF0000';

  // Already hex format
  if (color.startsWith('#')) {
    return color.substring(0, 7);
  }

  // RGB format: rgb(65, 118, 217)
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]).toString(16).padStart(2, '0');
      const g = parseInt(match[1]).toString(16).padStart(2, '0');
      const b = parseInt(match[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }

  return '#FF0000'; // Default red
}

class GameSessionHelper {
  constructor(gameSessionService, repositoryManager) {
    this.gameSessionService = gameSessionService;
    this.repositoryManager = repositoryManager;
  }

  /**
   * Save game results for all players when game ends (Game Over)
   * Creates NEW records in game_sessions for each player
   * @param {string} roomId - Room identifier
   * @param {Game} gameInstance - Game instance
   */
  async saveGameResults(roomId, gameInstance) {
    if (!gameInstance) {
      console.warn('Game instance not found for saving game results');
      return;
    }

    console.log(`[GAME-RESULTS] Saving results for room ${roomId}, ${gameInstance.players.size} players`);

    // Process each player
    for (const [playerId, playerData] of gameInstance.players.entries()) {
      try {
        // Get the authenticated user ID for this player
        const authenticatedUserId = gameInstance.authenticatedUserIds?.[playerId];

        if (!authenticatedUserId || typeof authenticatedUserId !== 'string') {
          console.warn(`[GAME-RESULTS] Skipping player ${playerId.slice(-6)} - no valid userId`);
          continue;
        }

        const score = playerData.score || 0;
        const gameResult = gameInstance.getGameResult(playerId);
        const durationSeconds = gameInstance.getPlayerDuration(playerId);
        const linesCleared = gameInstance.getLinesCleared();
        const figuresPlaced = gameInstance.getFiguresPlaced();

        console.log(`[GAME-RESULTS] Player ${shortUserIdHash(authenticatedUserId)}: score=${score}, result=${gameResult}`);

        // Create a NEW game session record
        const sessionData = {
          player_id: authenticatedUserId,
          room_id: roomId,
          player_color: toHexColor(playerData.color),
          score: score,
          lines_cleared: linesCleared,
          figures_placed: figuresPlaced,
          duration_seconds: durationSeconds,
          game_result: gameResult,
          final_grid: JSON.stringify(gameInstance.grid),
          session_data: JSON.stringify({
            players: Array.from(gameInstance.players.entries()).map(([id, p]) => ({
              id,
              score: p.score,
              color: p.color
            })),
            game_mode: 'classic',
            grid_width: gameInstance.gridWidth,
            grid_height: gameInstance.gridHeight
          })
        };

        // Insert new record
        const createdSession = await this.repositoryManager.gameSessions.createWithScore(sessionData);
        console.log(`[GAME-RESULTS] Created session ${createdSession.id} for player ${shortUserIdHash(authenticatedUserId)}`);

        // Update player statistics
        await this.updatePlayerStatistics(authenticatedUserId, {
          score,
          lines_cleared: linesCleared,
          figures_placed: figuresPlaced,
          duration_seconds: durationSeconds,
          game_result: gameResult
        });

      } catch (error) {
        console.error(`[GAME-RESULTS] Error saving result for player ${playerId.slice(-6)}:`, error);
      }
    }
  }

  /**
   * Update player statistics after game completion
   * @param {string} userId - User ID
   * @param {Object} gameData - Game result data
   */
  async updatePlayerStatistics(userId, gameData) {
    try {
      if (!userId || typeof userId !== 'string' || !userId.match(/^[0-9a-fA-F-]{36}$/)) {
        console.log(`[STATS] Skipping stats update for invalid userId: ${userId}`);
        return;
      }

      await this.repositoryManager.gameStatistics.updateFromGameSessionWithTransaction(userId, gameData);
      console.log(`[STATS] Updated statistics for ${shortUserIdHash(userId)}`);
    } catch (error) {
      console.error(`[STATS] Error updating statistics for ${shortUserIdHash(userId)}:`, error);
    }
  }
}

module.exports = GameSessionHelper;
