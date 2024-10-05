require('./data/db');
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const passport = require('./passport');
const session = require('express-session');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./data/models/User');


// Correctly initialize Socket.io with the HTTP server and CORS options
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200', // Your Angular app's URL
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials if needed
  },
});

// Middleware
app.use(
  cors({
    origin: 'http://localhost:4200', // Allow your Angular app's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true, // Allow credentials (cookies, session)
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Use the actual environment variable
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
const PORT = 3000;

io.on('connection', (socket) => {
  console.log('A user connected');

  // Extract user ID from token
  const token = socket.handshake.auth.token;
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      userId = decoded.id;
      // Mark user as online
      User.findByIdAndUpdate(userId, { isOnline: true }).exec();
    } catch (err) {
      console.error('Socket authentication error:', err);
    }
  }

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    if (userId) {
      // Mark user as offline
      User.findByIdAndUpdate(userId, { isOnline: false }).exec();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});