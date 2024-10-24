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

const Matchmaker = require('./models/matchMaker'); 
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

// Map to store userId to socketId
const userIdToSocketId = new Map();

// Initialize after creating the io instance 
const matchmaker = new Matchmaker(io); 

// Server Port 
const PORT = process.env.PORT || 3000; 

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

  // Add to userIdToSocketId map
  userIdToSocketId.set(socket.userId, socket.id);
 
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
      console.log(`Broadcasted general message: ${message.content}`); 
    } else { 
      // Private message 
      const recipientUserId = tabId; 
      const recipientSocketId = userIdToSocketId.get(recipientUserId); 
      if (recipientSocketId && io.sockets.sockets.has(recipientSocketId)) { 
        io.to(recipientSocketId).emit("message", { tabId: socket.userId, message }); 
        socket.emit("message", { tabId: recipientUserId, message }); 
        console.log(`Sent private message from ${socket.userId} to ${recipientUserId}: ${message.content}`); 
      } else { 
        console.error(`Recipient user ID ${recipientUserId} socket not found.`); 
        // Optionally notify sender that recipient is not available
        socket.emit("messageError", { 
          tabId: recipientUserId, 
          error: "Recipient is not available or offline.", 
        }); 
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

    // Remove from userIdToSocketId map
    userIdToSocketId.delete(socket.userId);

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