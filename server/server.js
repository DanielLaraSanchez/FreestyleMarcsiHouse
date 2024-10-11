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
const { v4: uuidv4 } = require('uuid'); // Import uuid for room IDs

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

// Matchmaking Queue
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

      const payloadToRecipient = { 
        tabId: socket.userId, // The sender's userId 
        message, 
      }; 
      const payloadToSender = { 
        tabId: tabId, // The recipient's userId 
        message, 
      }; 

      if (recipientSockets && recipientSockets.size > 0) { 
        // Send the message to all recipient's sockets 
        recipientSockets.forEach((socketId) => { 
          io.to(socketId).emit('message', payloadToRecipient); 
        }); 
      } else { 
        console.error(`Recipient not found or not online: ${tabId}`); 
      } 
      // Send the message back to the sender's own tab 
      socket.emit('message', payloadToSender); 
    } 
  }); 

  // Handle battle requests for matchmaking
  socket.on('startRandomBattle', () => {
    console.log(`User ${socket.userId} requested a random battle.`);

    // Check if user is already in the matchmaking queue
    const isAlreadyInQueue = matchmakingQueue.find(user => user.userId === socket.userId);
    if (isAlreadyInQueue) {
      console.log(`User ${socket.userId} is already in the matchmaking queue.`);
      return;
    }

    // Add user to the matchmaking queue
    matchmakingQueue.push({ userId: socket.userId, socketId: socket.id });
    console.log(`User ${socket.userId} added to matchmaking queue.`);

    // If there are at least two users, pair them
    if (matchmakingQueue.length >= 2) {
      const [user1, user2] = matchmakingQueue.splice(0, 2);
      const roomId = uuidv4(); // Generate a unique room ID

      // Join both sockets to the room
      socket.join(roomId);
      io.to(user2.socketId).socketsJoin(roomId);

      // Notify both users that they have been paired
      io.to(user1.socketId).emit('battleFound', { roomId, partnerId: user2.userId });
      io.to(user2.socketId).emit('battleFound', { roomId, partnerId: user1.userId });

      console.log(`Paired User ${user1.userId} and User ${user2.userId} in room ${roomId}.`);
    }
  });

  // Handle WebRTC offers
  socket.on('webrtc_offer', (data) => {
    const { roomId, offer } = data;
    socket.to(roomId).emit('webrtc_offer', { offer });
    console.log(`Relayed WebRTC offer in room ${roomId}.`);
  });

  // Handle WebRTC answers
  socket.on('webrtc_answer', (data) => {
    const { roomId, answer } = data;
    socket.to(roomId).emit('webrtc_answer', { answer });
    console.log(`Relayed WebRTC answer in room ${roomId}.`);
  });

  // Handle ICE candidates
  socket.on('webrtc_ice_candidate', (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit('webrtc_ice_candidate', { candidate });
    console.log(`Relayed ICE candidate in room ${roomId}.`);
  });

  // Handle disconnections
  socket.on('disconnect', () => { 
    console.log('A user disconnected:', socket.id); 

    // Remove user from matchmaking queue if present
    matchmakingQueue = matchmakingQueue.filter(user => user.socketId !== socket.id);
    if (matchmakingQueue.length !== 0) {
      console.log(`Updated matchmaking queue: ${matchmakingQueue.length} users waiting.`);
    }

    const userId = socket.userId; 
    if (userId) { 
      // Existing disconnect handling...
      const sockets = userSockets.get(userId); 
      if (sockets) { 
        sockets.delete(socket.id); 
        if (sockets.size === 0) { 
          userSockets.delete(userId); 

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
    }
  }); 
});

server.listen(PORT, () => { 
  console.log(`Server is running on port ${PORT}`); 
});