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
app.use('/auth', authRoutes);

const PORT = 3000;

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle incoming messages
  socket.on('message', (data) => {
    const { tabId, message } = data;

    // For private chats, we can use rooms
    if (tabId !== 'general') {
      // Join the sender to a room with the tabId (which could be the recipient's ID)
      socket.join(tabId);
      // Emit the message to the room (both sender and receiver)
      io.to(tabId).emit('message', { tabId, message });
    } else {
      // For the general chat, broadcast to all connected sockets except the sender
      socket.broadcast.emit('message', { tabId, message });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});