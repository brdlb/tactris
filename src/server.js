require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');

// Database and repository configuration
const { pool, query, healthCheck, closePool, repositoryManager } = require('./config/db');

// Services
const GameSessionService = require('./services/GameSessionService');
const AuthService = require('./services/AuthService');
const GameRoomManager = require('./services/GameRoomManager');
const GameSessionHelper = require('./services/GameSessionHelper');
const PeriodicTasksService = require('./services/PeriodicTasksService');

// Middleware
const { sessionValidation } = require('./middleware/sessionValidation');
const { createSocketAuthMiddleware } = require('./middleware/socketAuth');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const createPublicRoutes = require('./routes/public');

// Socket handlers
const createConnectionHandlers = require('./handlers/socket/connectionHandlers');
const createRoomHandlers = require('./handlers/socket/roomHandlers');
const createGameHandlers = require('./handlers/socket/gameHandlers');

// Initialize services
const gameSessionService = new GameSessionService(
  repositoryManager.gameSessions,
  repositoryManager.gameStatistics
);

const gameRoomManager = new GameRoomManager();
const gameSessionHelper = new GameSessionHelper(gameSessionService, repositoryManager);

// Express app setup
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

// Public routes (must be defined before session validation)
app.use(createPublicRoutes(repositoryManager));

// Apply session validation middleware to all other routes
app.use(sessionValidation);

// Protected routes
app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);

// Serve static files from the client build directory (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Socket.IO authentication middleware
io.use(createSocketAuthMiddleware(repositoryManager));

// Initialize socket event handlers
const roomHandlers = createRoomHandlers(gameRoomManager, gameSessionHelper, repositoryManager, io);
const gameHandlers = createGameHandlers(gameRoomManager, gameSessionHelper, io);
const connectionHandlers = createConnectionHandlers(
  gameRoomManager,
  gameSessionHelper,
  repositoryManager,
  io,
  roomHandlers.handlePlayerLeave
);

// Register socket event handlers
io.on('connection', (socket) => {
  // Register connection handler (sends initial lobby state)
  connectionHandlers.handleConnection(socket);
  
  // Register room handlers
  roomHandlers.registerHandlers(socket);
  
  // Register game handlers
  gameHandlers.registerHandlers(socket);
  
  // Register disconnect handler
  socket.on('disconnect', () => connectionHandlers.handleDisconnect(socket));
});

// Initialize periodic tasks service
const authServiceForCleanup = new AuthService(repositoryManager.users, repositoryManager.sessions);
const periodicTasksService = new PeriodicTasksService(gameRoomManager, io, authServiceForCleanup);

// Start periodic cleanup tasks
periodicTasksService.startAll();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  periodicTasksService.stopAll();
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  periodicTasksService.stopAll();
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

    // Perform startup cleanup
    setTimeout(async () => {
      await periodicTasksService.performStartupCleanup();
    }, 30000); // 30 seconds after startup

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database connection pool initialized');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 3000;
startServer();
