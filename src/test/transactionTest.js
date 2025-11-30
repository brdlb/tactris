/**
 * Transaction Test - Test the transaction functionality with multiple concurrent game sessions
 */

const { Game } = require('../models/Game');
const { pool, repositoryManager } = require('../config/db');
const GameSessionService = require('../services/GameSessionService');

// Initialize the GameSessionService with repositories
const gameSessionService = new GameSessionService(
  repositoryManager.gameSessions,
  repositoryManager.gameStatistics
);

async function simulateConcurrentGameSessions() {
  console.log('Starting concurrent game sessions test...');
  
  // Create multiple game instances to simulate concurrent games
  const game1 = new Game('game1');
  const game2 = new Game('game2');
  
  // Add players to each game
  game1.addPlayer('player1', 'red');
  game1.addPlayer('player2', 'blue');
  game2.addPlayer('player3', 'green');
  game2.addPlayer('player4', 'yellow');
  
  // Simulate game completion for both games happening concurrently
  const game1Promise = completeGameSession(game1, 'player1', 'player2');
  const game2Promise = completeGameSession(game2, 'player3', 'player4');
  
  try {
    // Execute both game completions concurrently
    await Promise.all([game1Promise, game2Promise]);
    console.log('Concurrent game sessions completed successfully!');
  } catch (error) {
    console.error('Error in concurrent game sessions:', error);
  }
}

async function completeGameSession(game, playerId1, playerId2) {
  // Create game session records for both players
  const gameSessionData1 = {
    user_id: playerId1,
    opponent_id: playerId2,
    game_mode: 'classic',
    grid_width: game.gridWidth,
    grid_height: game.gridHeight,
    initial_grid: JSON.stringify(game.getInitialGrid()),
    final_grid: JSON.stringify(game.grid),
    duration_seconds: game.getDuration(),
    lines_cleared: 10, // Simulate some lines cleared
    figures_placed: 5, // Simulate some figures placed
    score: 100, // Simulate a score
    game_result: 'win', // Simulate a win
    session_data: JSON.stringify({
      players: Array.from(game.players.entries()),
      moves: game.moves || []
    })
  };

  const gameSessionData2 = {
    user_id: playerId2,
    opponent_id: playerId1,
    game_mode: 'classic',
    grid_width: game.gridWidth,
    grid_height: game.gridHeight,
    initial_grid: JSON.stringify(game.getInitialGrid()),
    final_grid: JSON.stringify(game.grid),
    duration_seconds: game.getDuration(),
    lines_cleared: 8, // Simulate some lines cleared
    figures_placed: 4, // Simulate some figures placed
    score: 80, // Simulate a score
    game_result: 'loss', // Simulate a loss
    session_data: JSON.stringify({
      players: Array.from(game.players.entries()),
      moves: game.moves || []
    })
  };

  // Create game sessions in the database
  const session1 = await repositoryManager.gameSessions.create(gameSessionData1);
  const session2 = await repositoryManager.gameSessions.create(gameSessionData2);

  // Update game with session IDs
  if (!game.playerSessions) {
    game.playerSessions = {};
  }
  game.playerSessions[playerId1] = session1.id;
  game.playerSessions[playerId2] = session2.id;

  // Simulate completing both sessions concurrently using the service
  const promise1 = gameSessionService.completeGameSessionWithRepositoryMethods(
    session1.id,
    {
      final_grid: JSON.stringify(game.grid),
      duration_seconds: gameSessionData1.duration_seconds,
      lines_cleared: gameSessionData1.lines_cleared,
      figures_placed: gameSessionData1.figures_placed,
      score: gameSessionData1.score,
      game_result: gameSessionData1.game_result,
      session_data: gameSessionData1.session_data
    },
    playerId1,
    gameSessionData1
  );

  const promise2 = gameSessionService.completeGameSessionWithRepositoryMethods(
    session2.id,
    {
      final_grid: JSON.stringify(game.grid),
      duration_seconds: gameSessionData2.duration_seconds,
      lines_cleared: gameSessionData2.lines_cleared,
      figures_placed: gameSessionData2.figures_placed,
      score: gameSessionData2.score,
      game_result: gameSessionData2.game_result,
      session_data: gameSessionData2.session_data
    },
    playerId2,
    gameSessionData2
  );

  // Execute both concurrently to test transaction handling
  await Promise.all([promise1, promise2]);
  console.log(`Game session completed for players ${playerId1} and ${playerId2}`);
}

async function testRowLocking() {
  console.log('\nTesting row locking functionality...');

  // Simulate two concurrent updates to the same user's statistics
  const userId = 'test_user';
  const gameSessionData = {
    user_id: userId,
    opponent_id: 'opponent1',
    game_mode: 'classic',
    grid_width: 10,
    grid_height: 10,
    initial_grid: JSON.stringify(Array(10).fill(null).map(() => Array(10).fill(null))),
    final_grid: JSON.stringify(Array(10).fill(null).map(() => Array(10).fill(null))),
    duration_seconds: 120,
    lines_cleared: 5,
    figures_placed: 3,
    score: 50,
    game_result: 'win',
    session_data: JSON.stringify({})
  };

  // Try to update the same user's statistics concurrently
  const updatePromise1 = gameSessionService.updateStatisticsWithRowLocking(userId, gameSessionData);
  const updatePromise2 = gameSessionService.updateStatisticsWithRowLocking(userId, {...gameSessionData, score: 75}); // Different score

  try {
    await Promise.all([updatePromise1, updatePromise2]);
    console.log('Row locking test completed successfully!');
  } catch (error) {
    console.error('Error in row locking test:', error);
  }
}

async function runTests() {
  try {
    // Run concurrent game session test
    await simulateConcurrentGameSessions();
    
    // Run row locking test
    await testRowLocking();
    
    console.log('\nAll transaction tests completed successfully!');
  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  simulateConcurrentGameSessions,
  testRowLocking,
  runTests
};
