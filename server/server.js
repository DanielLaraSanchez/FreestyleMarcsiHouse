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

// Map to keep track of userId to socketId
const userSockets = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // After authentication, store user information in socket
  const token = socket.handshake.auth.token;
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      socket.userId = userId; // Attach userId to the socket for future reference

      // Store the mapping of userId to socket.id
      userSockets[userId] = socket.id;

      // Mark user as online
      User.findByIdAndUpdate(userId, { isOnline: true }).exec();

      // Notify all clients that a user is online
      io.emit('userOnline', { userId });

    } catch (err) {
      console.error('Socket authentication error:', err);
      socket.disconnect();
      return;
    }
  } else {
    console.error('No token provided in socket handshake auth');
    socket.disconnect();
    return;
  }

  socket.on('message', (data) => {
    const { tabId, message } = data;

    if (tabId === 'general') {
      // Broadcast message to all connected clients except the sender
      socket.broadcast.emit('message', { tabId: 'general', message });
    } else {
      // Handle private messages
      const recipientSocketId = userSockets[tabId]; // 'tabId' is recipient's userId
      if (recipientSocketId) {
        const payload = {
          tabId: socket.userId, // The sender's userId
          message,
        };
        io.to(recipientSocketId).emit('message', payload);
      } else {
        console.error(`Recipient socket not found for userId: ${tabId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    if (userId) {
      // Remove user from userSockets
      delete userSockets[userId];

      // Mark user as offline
      User.findByIdAndUpdate(userId, { isOnline: false }).exec();

      // Notify all clients that a user is offline
      io.emit('userOffline', { userId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});