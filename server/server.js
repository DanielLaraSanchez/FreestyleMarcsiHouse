require("./data/db"); // Database connection 
require("dotenv").config(); // Environment variables 
const cors = require("cors"); 
const express = require("express"); 
const app = express(); 
const http = require("http"); 
const server = http.createServer(app); 
const passport = require("./passport"); // Passport configuration 
const session = require("express-session"); 
const { Server } = require("socket.io"); 
const jwt = require("jsonwebtoken"); 
const User = require("./data/models/User"); 
const { v4: uuidv4 } = require("uuid"); // For unique room IDs 

// Initialize Socket.io with CORS Configuration 
const io = new Server(server, { 
  cors: { 
    origin: "http://localhost:4200", // Frontend URL 
    methods: ["GET", "POST"], 
    credentials: true, 
  }, 
});

// Middleware Setup 
app.use( 
  cors({ 
    origin: "http://localhost:4200", 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    credentials: true, 
  }) 
); 
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

// Server Port 
const PORT = process.env.PORT || 3000; 

// Matchmaking Queue and Room Management 
let matchmakingQueue = new Set(); // Stores unique socket IDs waiting for matchmaking 
const socketRoomMap = new Map(); // Maps socket.id to roomId 

// Temporary Debugging Route (Remove in Production) 
app.get("/debug-rooms", (req, res) => { 
  const rooms = Array.from(io.sockets.adapter.rooms.entries()).map( 
    ([room, sockets]) => ({ 
      room, 
      sockets: Array.from(sockets), 
    }) 
  ); 
  res.json(rooms); 
}); 

// Socket.io Connection Handling 
io.on("connection", (socket) => { 
  console.log("A user connected:", socket.id); 
  console.log("Current matchmaking queue before authentication:", Array.from(matchmakingQueue), socketRoomMap);

  // Retrieve token from query parameters 
  const token = socket.handshake.query.token; 
  if (!token) { 
    console.error("No token provided in socket handshake."); 
    socket.disconnect(); 
    return; 
  } 

  // Verify JWT Token 
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => { 
    if (err || !decoded || !decoded.id) { 
      console.error("Invalid token. Could not extract user ID."); 
      socket.disconnect(); 
      return; 
    } 

    const userId = decoded.id; 
    socket.userId = userId; 

    console.log(`Socket ${socket.id} belongs to User ${userId}`); 

    try { 
      // Update user online status 
      const user = await User.findByIdAndUpdate( 
        userId, 
        { isOnline: true }, 
        { new: true } 
      ); 
      if (user) { 
        // Emit 'userOnline' event to all clients 
        io.emit("userOnline", { userId: socket.id }); 
        console.log(`User ${socket.id} is now online.`); 
      } 
    } catch (err) { 
      console.error("Error updating user status:", err); 
    } 

    // Handle Incoming Messages 
    socket.on("message", (data) => { 
      const { tabId, message } = data; 

      if (tabId === "general") { 
        // Broadcast to all clients including sender 
        io.emit("message", { tabId: "general", message }); 
        console.log("Broadcasted general message:", message); 
      } else { 
        // Private message handling 
        const recipientSocketId = tabId; // 'tabId' is recipient's socket.id 

        const payloadToRecipient = { 
          tabId: socket.id, // Sender's socket.id 
          message, 
        }; 
        const payloadToSender = { 
          tabId: recipientSocketId, // Recipient's socket.id 
          message, 
        }; 

        // Send the message to the recipient's socket 
        io.to(recipientSocketId).emit("message", payloadToRecipient); 
        console.log( 
          `Sent private message from ${socket.id} to ${recipientSocketId}:`, 
          message 
        ); 

        // Optional: Send confirmation back to the sender 
        socket.emit("message", payloadToSender); 
      } 
    }); 

    // Handle Battle Requests for Matchmaking 
    socket.on("startRandomBattle", async () => { 
      console.log(`Socket ${socket.id} requested a random battle.`); 
    
      // Check if socket is already in the matchmaking queue 
      if (matchmakingQueue.has(socket.id)) { 
        console.log(`Socket ${socket.id} is already in the matchmaking queue.`); 
        return; 
      } 
    
      // Add socket to the matchmaking queue 
      matchmakingQueue.add(socket.id); 
      console.log(`Socket ${socket.id} added to matchmaking queue.`); 
    
      // Log current matchmaking queue 
      console.log("Current matchmaking queue:", Array.from(matchmakingQueue), socketRoomMap); 
    
      // If there are at least two sockets, pair them 
      if (matchmakingQueue.size >= 2) { 
        const iterator = matchmakingQueue.values(); 
        const socketId1 = iterator.next().value; 
        matchmakingQueue.delete(socketId1); 
        console.log(`Socket ${socketId1} removed from matchmaking queue for pairing.`); 
        const socketId2 = iterator.next().value; 
        matchmakingQueue.delete(socketId2); 
        console.log(`Socket ${socketId2} removed from matchmaking queue for pairing.`); 
    
        // Prevent pairing the same socket with itself 
        if (socketId1 === socketId2) { 
          console.log(`Cannot pair Socket ${socketId1} with itself.`); 
          // Re-add the socket to the queue 
          matchmakingQueue.add(socketId1); 
          console.log(`Socket ${socketId1} re-added to matchmaking queue due to self-pairing attempt.`); 
          return; 
        } 
    
        // Generate a unique room ID 
        const roomId = uuidv4(); 
        console.log(`Generated room ID: ${roomId} for pairing Socket ${socketId1} and Socket ${socketId2}.`); 
    
        // Retrieve socket instances 
        const socket1 = io.sockets.sockets.get(socketId1); 
        const socket2 = io.sockets.sockets.get(socketId2); 
    
        if (!socket1 || !socket2) { 
          console.error(`One or both sockets not found: ${socketId1}, ${socketId2}`); 
          // Re-add sockets back to the queue if any are missing 
          if (socket1) matchmakingQueue.add(socketId1); 
          if (socket2) matchmakingQueue.add(socketId2); 
          return; 
        } 
    
        try { 
          // Join socket1 to the room 
          await socket1.join(roomId); 
          console.log(`Socket ${socketId1} joined room ${roomId}.`); 
          socketRoomMap.set(socketId1, roomId); 
          console.log(`Room '${roomId}' now has sockets:`, Array.from(io.sockets.adapter.rooms.get(roomId) || [])); 
    
          // Join socket2 to the room 
          await socket2.join(roomId); 
          console.log(`Socket ${socketId2} joined room ${roomId}.`); 
          socketRoomMap.set(socketId2, roomId); 
          console.log(`Room '${roomId}' now has sockets:`, Array.from(io.sockets.adapter.rooms.get(roomId) || [])); 
    
          // Notify both sockets that a battle has been found 
          io.to(socketId1).emit("battleFound", { 
            roomId, 
            partnerSocketId: socketId2, 
          }); 
          io.to(socketId2).emit("battleFound", { 
            roomId, 
            partnerSocketId: socketId1, 
          }); 
    
          console.log(`Paired Socket ${socketId1} and Socket ${socketId2} in room ${roomId}.`); 
        } catch (err) { 
          console.error(`Error joining sockets to room ${roomId}:`, err); 
          // Re-add sockets back to the queue in case of failure 
          matchmakingQueue.add(socketId1); 
          matchmakingQueue.add(socketId2); 
          console.log(`Re-added Socket ${socketId1} and Socket ${socketId2} to matchmaking queue due to error.`); 
        } 
      } 
    });

    // Handle WebRTC Signaling Events 

    // Relay WebRTC Offers to the Room 
    socket.on("webrtc_offer", (data) => { 
      const { roomId, offer } = data; 
      if (!roomId || !offer) { 
        console.error("Invalid webrtc_offer data:", data); 
        return; 
      } 
      console.log(`Relaying WebRTC offer to room ${roomId}.`); 
      socket.to(roomId).emit("webrtc_offer", { offer }); 
    }); 

    // Relay WebRTC Answers to the Room 
    socket.on("webrtc_answer", (data) => { 
      const { roomId, answer } = data; 
      if (!roomId || !answer) { 
        console.error("Invalid webrtc_answer data:", data); 
        return; 
      } 
      console.log(`Relaying WebRTC answer to room ${roomId}.`); 
      socket.to(roomId).emit("webrtc_answer", { answer }); 
    }); 

    // Relay ICE Candidates to the Room 
    socket.on("webrtc_ice_candidate", (data) => { 
      const { roomId, candidate } = data; 
      if (!roomId || !candidate) { 
        console.error("Invalid webrtc_ice_candidate data:", data); 
        return; 
      } 
      socket.to(roomId).emit("webrtc_ice_candidate", { candidate }); 
    }); 

    // Handle Disconnections 
    socket.on("disconnect", () => { 
      console.log("A user disconnected:", socket.id); 
      console.log("Current socketRoomMap before disconnect:", socketRoomMap); 
    
      // Retrieve the room ID from the map 
      const roomId = socketRoomMap.get(socket.id); 
      if (roomId) { 
        console.log(`Socket ${socket.id} was in room ${roomId}.`); 
    
        // Retrieve all clients in the room 
        const clients = io.sockets.adapter.rooms.get(roomId); 
        if (clients) { 
          console.log(`Current clients in room ${roomId} before notifying:`, Array.from(clients)); 
          clients.forEach((clientId) => { 
            matchmakingQueue.delete(clientId);
            socketRoomMap.delete(clientId);
            if (clientId !== socket.id) { 
              // Notify the remaining client in the room 
              io.to(clientId).emit("partnerDisconnected"); 
              console.log(`Notified ${clientId} that their partner disconnected from room ${roomId}.`); 
    
              // Remove the mapping for the remaining client 
              socketRoomMap.delete(clientId); 
    
              // Re-add the remaining client to matchmaking queue if not already present 
              // if (!matchmakingQueue.has(clientId)) { 
              //   matchmakingQueue.add(clientId); 
              //   console.log(`Socket ${clientId} re-added to matchmaking queue due to partner disconnection.`); 
              // } 
            } 
          }); 
        } else { 
          console.log(`No remaining clients in room ${roomId} after disconnection.`); 
        } 
    
        // Remove the mapping for the disconnected socket 
        socketRoomMap.delete(socket.id); 
      } else { 
        console.log(`Socket ${socket.id} was not in any room.`); 
      } 
    
      // Remove socket from matchmaking queue if present 
      if (matchmakingQueue.has(socket.id)) { 
        matchmakingQueue.delete(socket.id); 
        console.log(`Socket ${socket.id} removed from matchmaking queue. Current queue length: ${matchmakingQueue.size}`); 
      } else { 
        console.log(`Socket ${socket.id} was not in the matchmaking queue.`); 
      } 
    
      // Update user online status 
      if (socket.userId) { 
        User.findByIdAndUpdate(socket.userId, { isOnline: false }, { new: true }) 
          .then((user) => { 
            if (user) { 
              // Emit 'userOffline' event to all clients 
              io.emit("userOffline", { userId: socket.id }); 
              console.log(`User ${socket.id} is now offline.`); 
            } 
          }) 
          .catch((err) => { 
            console.error("Error updating user status:", err); 
          }); 
      } else { 
        console.log(`Socket ${socket.id} has no associated userId.`); 
      } 
    });
  }); 
});

// Handle unexpected errors to prevent server crash
io.on("error", (error) => {
  console.error("Socket.io Error:", error);
});

// Start the Server 
server.listen(PORT, () => { 
  console.log(`Server is running on port ${PORT}`); 
});