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
const { v4: uuidv4 } = require('uuid'); // For unique room IDs

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

// Matchmaking Queue - stores socketId's
let matchmakingQueue = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Get token from query parameters
  const token = socket.handshake.query.token;
  if (!token) {
    console.error('No token provided in socket handshake.');
    socket.disconnect();
    return;
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err || !decoded || !decoded.id) {
      console.error('Invalid token. Could not extract user ID.');
      socket.disconnect();
      return;
    }

    const userId = decoded.id;
    socket.userId = userId;

    console.log(`Socket ${socket.id} belongs to User ${userId}`);

    try {
      // Update user online status
      const user = await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
      if (user) {
        // Emit 'userOnline' event to all clients
        io.emit('userOnline', { userId: user._id });
        console.log(`User ${user._id} is now online.`);
      }
    } catch (err) {
      console.error('Error updating user status:', err);
    }

    // Handle incoming messages
    socket.on('message', (data) => {
      const { tabId, message } = data;

      if (tabId === 'general') {
        // Broadcast message to all connected clients including the sender
        io.emit('message', { tabId: 'general', message });
        console.log('Broadcasted general message:', message);
      } else {
        // Handle private messages
        const recipientSocketId = tabId; // 'tabId' is recipient's socket.id

        const payloadToRecipient = {
          tabId: socket.id, // The sender's socket.id
          message,
        };
        const payloadToSender = {
          tabId: recipientSocketId, // The recipient's socket.id
          message,
        };

        // Send the message to the recipient's socket
        io.to(recipientSocketId).emit('message', payloadToRecipient);
        console.log(`Sent private message to ${recipientSocketId}:`, message);

        // Optionally, send confirmation back to the sender
        socket.emit('message', payloadToSender);
      }
    });

    // Handle battle requests for matchmaking
    socket.on('startRandomBattle', () => {
      console.log(`Socket ${socket.id} requested a random battle.`);

      // Check if socket is already in the matchmaking queue
      if (matchmakingQueue.includes(socket.id)) {
        console.log(`Socket ${socket.id} is already in the matchmaking queue.`);
        return;
      }

      // Add socket to the matchmaking queue
      matchmakingQueue.push(socket.id);
      console.log(`Socket ${socket.id} added to matchmaking queue.`);

      // Log current matchmaking queue
      console.log('Current matchmaking queue:', matchmakingQueue);

      // If there are at least two sockets, pair them
      if (matchmakingQueue.length >= 2) {
        const [socketId1, socketId2] = matchmakingQueue.splice(0, 2);

        // Prevent pairing the same socket with itself
        if (socketId1 === socketId2) {
          console.log(`Cannot pair Socket ${socketId1} with itself.`);
          // Re-add the socket to the queue
          matchmakingQueue.push(socketId1);
          return;
        }

        const roomId = uuidv4(); // Generate a unique room ID

        // Join both sockets to the room
        io.sockets.sockets.get(socketId1)?.join(roomId);
        io.sockets.sockets.get(socketId2)?.join(roomId);

        // Notify both sockets that they have been paired
        io.to(socketId1).emit('battleFound', {
          roomId,
          partnerSocketId: socketId2,
        });
        io.to(socketId2).emit('battleFound', {
          roomId,
          partnerSocketId: socketId1,
        });

        console.log(`Paired Socket ${socketId1} and Socket ${socketId2} in room ${roomId}.`);

        // Log pairing details
        console.log(`Room ID: ${roomId}`);
      }
    });

    // Handle WebRTC offers
    socket.on('webrtc_offer', (data) => {
      const { roomId, offer } = data;
      socket.to(roomId).emit('webrtc_offer', { offer });
      console.log(`Relayed WebRTC offer to room ${roomId}.`);
    });

    // Handle WebRTC answers
    socket.on('webrtc_answer', (data) => {
      const { roomId, answer } = data;
      socket.to(roomId).emit('webrtc_answer', { answer });
      console.log(`Relayed WebRTC answer to room ${roomId}.`);
    });

    // Handle ICE candidates
    socket.on('webrtc_ice_candidate', (data) => {
      const { roomId, candidate } = data;
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate });
      console.log(`Relayed ICE candidate to room ${roomId}:`, candidate);
    });

    // Handle disconnections
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);

      // Remove socket from matchmaking queue if present
      const initialQueueLength = matchmakingQueue.length;
      matchmakingQueue = matchmakingQueue.filter((id) => id !== socket.id);
      if (matchmakingQueue.length !== initialQueueLength) {
        console.log(
          `Socket ${socket.id} removed from matchmaking queue. Current queue length: ${matchmakingQueue.length}`
        );
      }

      // Update user online status
      User.findByIdAndUpdate(userId, { isOnline: false }, { new: true })
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
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});