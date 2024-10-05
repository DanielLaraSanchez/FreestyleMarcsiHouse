require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io'); // Use socketio for better clarity
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust the path as needed

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: 'http://localhost:4200', // Your Angular app's URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// Import your routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users'); // Your user routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, () => {
  console.log('Connected to MongoDB');
});

// Map to keep track of userId to socketId
const userSockets = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Authenticate the socket
  const token = socket.handshake.auth.token;
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      socket.userId = userId;
      userSockets[userId] = socket.id;

      // Mark user as online
      User.findByIdAndUpdate(userId, { isOnline: true }, { new: true }).exec();

      // Notify other clients that a user is online
      socket.broadcast.emit('userOnline', { userId });
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

  // Handle incoming messages
  socket.on('message', (data) => {
    const { tabId, message } = data;

    if (tabId === 'general') {
      // Broadcast message to all connected clients except the sender
      socket.broadcast.emit('message', { tabId, message });
    } else {
      // Handle private messages
      const recipientSocketId = userSockets[tabId]; // tabId is the recipient's userId
      if (recipientSocketId) {
        // Send the message to the recipient
        io.to(recipientSocketId).emit('message', { tabId, message });
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
      User.findByIdAndUpdate(userId, { isOnline: false }, { new: true }).exec();

      // Notify other clients that a user is offline
      socket.broadcast.emit('userOffline', { userId });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});