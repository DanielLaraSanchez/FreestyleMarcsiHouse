const { v4: uuidv4 } = require("uuid");

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

      this.io.to(socketId1).emit("battleFound", { roomId, partner: { socketId: socketId2, userId: socket2.userId } });
      this.io.to(socketId2).emit("battleFound", { roomId, partner: { socketId: socketId1, userId: socket1.userId } });
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

module.exports = Matchmaker;