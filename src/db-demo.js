const { UserModel, GameSessionModel } = require('./models');

async function runDemo() {
  try {
    // Create a new user
    const newUser = await UserModel.create({
      display_name: 'Test User',
      is_anonymous: true,
      anonymous_id: `anon_${Date.now()}`
    });
    console.log('Created User:', newUser);

    // Find the user by ID
    const foundUser = await UserModel.findById(newUser.id);
    console.log('Found User:', foundUser);

    // Create a new game session for the user
    const newGameSession = await GameSessionModel.create({
      player_id: foundUser.id,
      player_color: 'blue',
      final_score: 1000,
      lines_cleared: 10,
      total_lines_cleared: 10,
      figures_placed: 20,
      game_duration_seconds: 120,
      final_grid: '{}',
      ending_reason: 'game_over',
      average_time_per_figure: 6,
      max_combo: 3,
      max_single_game_score: 1000,
    });
    console.log('Created Game Session:', newGameSession);

  } catch (error) {
    console.error('An error occurred during the demo:', error);
  }
}

runDemo();