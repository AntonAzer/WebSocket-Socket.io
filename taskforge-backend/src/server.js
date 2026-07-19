require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { initializeSocket } = require('./socket');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

connectDB();

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // required so the browser sends/receives the refresh-token cookie
  })
);
app.use(express.json({ limit: '10kb' })); // caps body size against payload-flood abuse
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ / . operators from user input to block NoSQL injection

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Health check ---
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'TaskForge API is running' });
});

// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/boards', boardRoutes);
app.use('/api/v1/tasks', taskRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// A plain http.Server wraps the Express app so Socket.io can share the
// same port instead of needing a second listener/process.
const server = http.createServer(app);

const io = initializeSocket(server);
app.set('io', io); // lets REST controllers do req.app.get('io').emit(...)

server.listen(PORT, () => {
  console.log(`[Server] TaskForge API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// Fail loudly instead of leaving the process in a broken half-alive state.
process.on('unhandledRejection', (err) => {
  console.error(`[UnhandledRejection] ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
