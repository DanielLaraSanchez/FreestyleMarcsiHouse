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

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
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

// Map to keep track of userId to Set of socket IDs
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Get token from query parameters
  const token = socket.handshake.query.token;
  if (!token) {
    console.error('No token provided in socket handshake.');
    socket.disconnect();
    return;
  }

  // Decode the token without verifying
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.id) {
    console.error('Invalid token. Could not extract user ID.');
    socket.disconnect();
    return;
  }

  const userId = decoded.id;
  socket.userId = userId;

  // Add socket ID to userSockets map
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);

  // If this is the first connection for the user, set them as online in the database
  if (userSockets.get(userId).size === 1) {
    // User just came online
    User.findByIdAndUpdate(
      userId,
      { isOnline: true },
      { new: true }
    )
      .then((user) => {
        if (user) {
          // Emit 'userOnline' event to all clients
          io.emit('userOnline', { userId: user._id });
          console.log(`User ${user._id} is now online.`);
        }
      })
      .catch((err) => {
        console.error('Error updating user status:', err);
      });
  } else {
    console.log(`User ${userId} already online with other sockets.`);
  }

  // Handle incoming messages
  socket.on('message', (data) => {
    const { tabId, message } = data;

    if (tabId === 'general') {
      // Broadcast message to all connected clients including the sender
      io.emit('message', { tabId: 'general', message });
    } else {
      // Handle private messages
      const recipientUserId = tabId; // 'tabId' is recipient's userId
      const recipientSockets = userSockets.get(recipientUserId);
      if (recipientSockets && recipientSockets.size > 0) {
        const payload = {
          tabId: socket.userId, // The sender's userId
          message,
        };
        // Send the message to all recipient's sockets
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('message', payload);
        });
        // Also send the message to the sender's own tab
        socket.emit('message', payload);
      } else {
        console.error(`Recipient not found or not online: ${tabId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    const userId = socket.userId;
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        // Remove user from userSockets map
        userSockets.delete(userId);

        // Update user's status in the database
        User.findByIdAndUpdate(
          userId,
          { isOnline: false },
          { new: true }
        )
          .then((user) => {
            if (user) {
              // Emit 'userOffline' event to all clients
              io.emit('userOffline', { userId: user._id });
              console.log(`User ${user._id} is now offline.`);
            }
          })
          .catch((err) => {
            console.error('Error updating user status:', err);
          });
      } else {
        console.log(`User ${userId} still has other active sockets.`);
      }
    } else {
      console.error(`No sockets found for user ${userId}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});