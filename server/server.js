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
const User = require('./data/models/User');

// Initialize Socket.io without authentication, but include userId in handshake
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
const userSockets = new Map(); // Use Map for better management
const onlineUsers = new Set(); // Set to keep track of online user IDs

io.on('connection', (socket) => {

  const userId = socket.handshake.auth.userId;
  if (!userId) {
    console.error('No userId provided in socket handshake.');
    socket.disconnect();
    return;
  }

  // Ensure userId is a string
  socket.userId = userId.toString();

  // Store the mapping of userId to socket.id
  userSockets.set(socket.userId, socket.id);

  // Add user to onlineUsers set
  onlineUsers.add(socket.userId);
  console.log('A user connected:', socket.id, "there are:", onlineUsers.size, "connected");

  // Notify other clients that a user is online
  socket.emit('userOnline', { userId: socket.userId });

  // Send the list of online users to the newly connected user
  socket.emit('onlineUsers', { onlineUsers: Array.from(onlineUsers) });

  console.log(`User ${socket.userId} connected via socket ${socket.id}`);

  // Handle incoming messages
  socket.on('message', (data) => {
    const { tabId, message } = data;

    if (tabId === 'general') {
      // Broadcast message to all connected clients including the sender
      io.emit('message', { tabId: 'general', message });
    } else {
      // Handle private messages
      const recipientSocketId = userSockets.get(tabId); // 'tabId' is recipient's userId
      if (recipientSocketId) {
        const payload = {
          tabId: socket.userId, // The sender's userId
          message,
        };
        io.to(recipientSocketId).emit('message', payload);
        // Also send the message to the sender's own tab
        socket.emit('message', payload);
      } else {
        console.error(`Recipient socket not found for userId: ${tabId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    if (socket.userId) {
      // Remove user from userSockets
      userSockets.delete(socket.userId);

      // Remove user from onlineUsers set
      onlineUsers.delete(socket.userId);

      // Notify other clients that a user is offline
      socket.broadcast.emit('userOffline', { userId: socket.userId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});