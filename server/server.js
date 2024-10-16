require("./data/db"); // Database connection
require("dotenv").config(); // Load environment variables

const express = require("express");
const cors = require("cors");
const http = require("http");
const session = require("express-session");
const passport = require("./passport"); // Passport configuration
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./data/models/User");
const { v4: uuidv4 } = require("uuid"); // For unique room IDs

const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: corsOptions,
});

// Server Port
const PORT = process.env.PORT || 3000;

// Matchmaking and Room Management
class Matchmaker {
  constructor(io) {
    this.io = io;
    this.queue = new Set();
    this.socketRoomMap = new Map();
    this.roomReadiness = new Map();
  }

  addToQueue(socketId) {
    this.queue.add(socketId);
    this.pairIfPossible();
  }

  removeFromQueue(socketId) {
    this.queue.delete(socketId);
  }

  pairIfPossible() {
    while (this.queue.size >= 2) {
      const iterator = this.queue.values();
      const socketId1 = iterator.next().value;
      const socketId2 = iterator.next().value;

      this.queue.delete(socketId1);
      this.queue.delete(socketId2);

      // Prevent pairing the same socket with itself
      if (socketId1 === socketId2) {
        console.log(`Cannot pair Socket ${socketId1} with itself. Re-adding to queue.`);
        this.queue.add(socketId1);
        continue;
      }

      this.createBattleRoom(socketId1, socketId2);
    }
  }

  async createBattleRoom(socketId1, socketId2) {
    const roomId = uuidv4();
    console.log(`Creating room ${roomId} with sockets ${socketId1} and ${socketId2}`);

    const socket1 = this.io.sockets.sockets.get(socketId1);
    const socket2 = this.io.sockets.sockets.get(socketId2);

    if (!socket1 || !socket2) {
      console.error(`One or both sockets not found: ${socketId1}, ${socketId2}`);
      if (socket1) this.queue.add(socketId1);
      if (socket2) this.queue.add(socketId2);
      return;
    }

    try {
      await socket1.join(roomId);
      await socket2.join(roomId);
      this.socketRoomMap.set(socketId1, roomId);
      this.socketRoomMap.set(socketId2, roomId);
      console.log(`Sockets ${socketId1} and ${socketId2} joined room ${roomId}`);

      // Notify both sockets
      this.io.to(socketId1).emit("battleFound", { roomId, partnerSocketId: socketId2 });
      this.io.to(socketId2).emit("battleFound", { roomId, partnerSocketId: socketId1 });
    } catch (err) {
      console.error(`Error joining room ${roomId}:`, err);
      if (socket1) this.queue.add(socketId1);
      if (socket2) this.queue.add(socketId2);
    }
  }

  handleDisconnect(socketId) {
    this.removeFromQueue(socketId);
    const roomId = this.socketRoomMap.get(socketId);
    if (roomId) {
      const room = this.io.sockets.adapter.rooms.get(roomId);
      if (room) {
        room.forEach((clientId) => {
          if (clientId !== socketId) {
            this.io.to(clientId).emit("partnerDisconnected");
            this.socketRoomMap.delete(clientId);
            this.queue.add(clientId);
          }
        });
      }
      this.socketRoomMap.delete(socketId);
    }
  }

  handleHangUp(socketId) {
    const roomId = this.socketRoomMap.get(socketId);
    if (roomId) {
      const room = this.io.sockets.adapter.rooms.get(roomId);
      if (room) {
        room.forEach((clientId) => {
          if (clientId !== socketId) {
            this.io.to(clientId).emit("partnerHangUp");
            this.socketRoomMap.delete(clientId);
            this.queue.add(clientId);
          }
        });
      }
      this.socketRoomMap.delete(socketId);
    }
  }

  handleReadyToStart(socketId) {
    const roomId = this.socketRoomMap.get(socketId);
    if (!roomId) {
      console.error(`Socket ${socketId} is not in any room.`);
      return;
    }

    if (!this.roomReadiness.has(roomId)) {
      this.roomReadiness.set(roomId, new Set());
    }

    const readySet = this.roomReadiness.get(roomId);
    readySet.add(socketId);

    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const allReady = Array.from(room).every(sId => readySet.has(sId));
      if (allReady) {
        this.io.to(roomId).emit("battleStart");
        this.roomReadiness.delete(roomId);
        console.log(`Battle in room ${roomId} started.`);
      }
    }
  }
}

const matchmaker = new Matchmaker(io);

// Temporary Debugging Route (Remove in Production)
app.get("/debug-rooms", (req, res) => {
  const rooms = Array.from(io.sockets.adapter.rooms.entries())
    .filter(([room, sockets]) => !io.sockets.sockets.get(room)) // Exclude individual sockets
    .map(([room, sockets]) => ({
      room,
      sockets: Array.from(sockets),
    }));
  res.json(rooms);
});

// Middleware for socket.io authentication
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided."));
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err || !decoded || !decoded.id) {
      return next(new Error("Authentication error: Invalid token."));
    }

    try {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Authentication error: User not found."));
      }
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      console.error("Authentication error:", err);
      next(new Error("Authentication error."));
    }
  });
});

// Socket.io Connection Handling
io.on("connection", (socket) => {
  console.log(`User connected: Socket ID ${socket.id}, User ID ${socket.userId}`);

  // Set user online status
  User.findByIdAndUpdate(socket.userId, { isOnline: true }, { new: true })
    .then(user => {
      if (user) {
        io.emit("userOnline", { userId: user._id.toString() });
        console.log(`User ${user._id} is now online.`);
      }
    })
    .catch(err => console.error("Error updating user status:", err));

  // Handle 'message' event
  socket.on("message", (data) => {
    const { tabId, message } = data;
    if (tabId === "general") {
      io.emit("message", { tabId: "general", message });
      console.log(`Broadcasted general message: ${message}`);
    } else {
      // Private message
      const recipientSocketId = tabId;
      if (io.sockets.sockets.has(recipientSocketId)) {
        io.to(recipientSocketId).emit("message", { tabId: socket.id, message });
        // Optionally, confirm to sender
        socket.emit("message", { tabId: recipientSocketId, message });
        console.log(`Sent private message from ${socket.id} to ${recipientSocketId}: ${message}`);
      } else {
        console.error(`Recipient socket ID ${recipientSocketId} not found.`);
      }
    }
  });

  // Handle 'startRandomBattle' event
  socket.on("startRandomBattle", () => {
    console.log(`Socket ${socket.id} requested a random battle.`);
    matchmaker.addToQueue(socket.id);
  });

  // Handle 'readyToStart' event
  socket.on("readyToStart", () => {
    console.log(`Socket ${socket.id} is ready to start the battle.`);
    matchmaker.handleReadyToStart(socket.id);
  });

  // WebRTC Signaling Events
  const signalingEvents = ['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'];
  signalingEvents.forEach(event => {
    socket.on(event, (data) => {
      const roomId = matchmaker.socketRoomMap.get(socket.id);
      if (!roomId) {
        console.error(`Socket ${socket.id} is not in any room. Cannot emit ${event}.`);
        return;
      }
      socket.to(roomId).emit(event, data);
      console.log(`Relayed ${event} from ${socket.id} to room ${roomId}`);
    });
  });

  // Handle 'hangUp' event
  socket.on("hangUp", () => {
    console.log(`Socket ${socket.id} initiated hang up.`);
    matchmaker.handleHangUp(socket.id);
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log(`User disconnected: Socket ID ${socket.id}, User ID ${socket.userId}`);
    matchmaker.handleDisconnect(socket.id);

    // Set user offline status
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { isOnline: false }, { new: true })
        .then(user => {
          if (user) {
            io.emit("userOffline", { userId: user._id.toString() });
            console.log(`User ${user._id} is now offline.`);
          }
        })
        .catch(err => console.error("Error updating user status:", err));
    }
  });
});

// Handle unexpected errors to prevent server crashes
io.on("error", (error) => {
  console.error("Socket.io Error:", error);
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});