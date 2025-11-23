# Tactris - Multiplayer Game

![Tactris Logo](https://img.shields.io/badge/Tactris-v1.0.0-blue.svg)

Tactris is an innovative multiplayer online game based on classic Tetris, but with a unique figure drawing mechanic. Instead of controlling falling blocks, players draw tetrominoes with their mouse directly on the game grid.

## 🎮 Game Features

### Unique Mechanics
- **Figure Drawing**: Players use the mouse to draw classic tetrominoes (I, O, T, S, Z, J, L) on a 10×10 grid
- **Real-time Validation**: System checks if drawn figures match available tetrominoes
- **Figure Orientation**: All 4 rotations of each figure are supported

### Multiplayer Mode
- **Room Creation**: Players can create private game rooms
- **Join Games**: Ability to join existing rooms
- **Real-time**: All actions are synchronized between players via WebSocket

### Game Logic
- **Scoring System**: 4 points for placing a figure + bonuses for clearing lines
- **Line Clearing**: Full rows and columns are cleared with bonus points
- **Multiple Bonuses**: Additional points for simultaneous line clearing
- **Game Over**: Game ends when no one can place their figures

## 🚀 Technologies

### Frontend
- **React 18** - modern JavaScript framework for user interface
- **Vite** - fast build tool for modern web projects
- **Socket.io Client** - bidirectional real-time communication
- **CSS Grid** - modern layout system for game board

### Backend
- **Node.js** - server-side JavaScript runtime
- **Express.js** - web framework for Node.js
- **Socket.io** - library for bidirectional real-time communication
- **Built-in Game Logic** - complete rule processing on server

## 📦 Installation and Running

### Prerequisites
- Node.js version 16 or higher
- npm or yarn

### Installation
```bash
# Clone repository
git clone <repository-url>
cd tactris

# Install dependencies
npm install
```

### Running in Development Mode
```bash
# Start server (in one terminal)
npm start

# Start client (in another terminal)
npm run dev
```

Server will start on port 3000, client - on port 5173.

### Production Build
```bash
# Build client
npm run build

# Start server in production mode
NODE_ENV=production npm start
```

## 🎯 Game Rules

### Basic Rules
1. **Game Board**: 10×10 cell grid
2. **Figures**: Each player receives random tetrominoes from the set {I, O, T, S, Z, J, L}
3. **Drawing**: Players draw figures with mouse by clicking and dragging across cells
4. **Validation**: Drawn figure must exactly match one of the available tetrominoes
5. **Placement**: After releasing mouse, figure solidifies and becomes fixed

### Scoring System
- **Place Figure**: +4 points
- **Clear Row**: +10 points
- **Clear Column**: +10 points
- **Multiple Clearing**: Additional +10 points for each additional line

### Game End
Game ends when no player can place their available figures on the field. Player with the highest score wins.

## 🏗️ Project Architecture

### File Structure
```
tactris/
├── src/
│   ├── server.js              # Server application
│   ├── models/
│   │   └── Game.js            # Game logic and model
│   └── client/
│       ├── index.html         # HTML entry point
│       ├── main.jsx           # React entry point
│       ├── modules/
│       │   ├── ui/
│       │   │   └── components/
│       │   │       ├── GameBoard.jsx  # Main game component
│       │   │       └── GameBoard.css  # Game board styles
│       │   └── network/
│       │       └── SocketManager.js   # WebSocket connection management
├── package.json               # Dependencies and scripts
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

### Game Logic
- **Game Class**: Manages game state, players, grid, and rules
- **Figure Validation**: Checks if drawn pixels match tetrominoes
- **State Management**: Synchronization between clients through server
- **Collision Detection**: Boundary checks and intersection with existing blocks

## 🎨 User Interface

### Responsive Design
- **Landscape Orientation**: Figure panel positioned to the left of game board
- **Portrait Orientation**: Figure panel positioned above game board
- **Fullscreen Mode**: Game occupies entire screen for optimal gaming experience

### Controls
- **Create Room**: "Create Room" button for creating new game
- **Join Game**: List of available rooms with join option
- **Drawing**: Left mouse button for placing pixels, hold for continuous drawing
- **Removal**: Right mouse button or drawing over existing pixels

## 🔧 Server API

### WebSocket Events

#### Incoming Events
- `create_room` - Create new game room
- `join_room` - Join existing room
- `get_rooms` - Get list of all available rooms
- `place_pixel` - Place/remove temporary pixel
- `place_figure` - Place final figure

#### Outgoing Events
- `room_created` - Room creation confirmation
- `room_joined` - Room join confirmation
- `game_update` - Game state update
- `game_over` - Game end notification
- `rooms_list` - List of available rooms
- `error` - Error messages

## 🎮 Gameplay

1. **Enter Game**: Player loads page and sees list of available rooms
2. **Create/Join**: Player creates new room or joins existing one
3. **Receive Figures**: Player receives 2 random figures for play
4. **Drawing**: Player draws one of available figures on game board
5. **Placement**: After completing drawing, figure automatically places
6. **Line Clearing**: Completed rows and columns clear with points gained
7. **Continuation**: Player receives new figures and continues game
8. **Game End**: Game ends when no one can place figures

## 🚀 Project Development

### Possible Improvements
- **User Authentication**: Registration and authorization system
- **Rating System**: Leaderboard and player statistics
- **Tournament Mode**: Time limits and special rules
- **Game Settings**: Customizable board size, special figures
- **Mobile Version**: Touch device adaptation
- **Sound Effects**: Music and sound effects
- **Animations**: Smooth transitions and visual effects

## 📄 License

This project is distributed under an open license. See LICENSE file for more information.

## 👥 Contributing

We welcome contributions to the project! Please follow the standard process:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have questions or suggestions, please create an Issue in the repository or contact the development team.

---

**Enjoy playing Tactris! 🎮**