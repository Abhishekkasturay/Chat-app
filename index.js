import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { nanoid } from "nanoid";

const app = express();
app.use(express.static("./public"));

// HTTP server
const httpServer = createServer(app);
httpServer.listen(3000, () => {
  console.log("HTTP server listening on port 3000");
});

// WebSocket server
const wsApp = express();
const wsServer = createServer(wsApp);
wsServer.listen(3001, () => {
  console.log("WebSocket server running on port 3001");
});

const io = new Server(wsServer, {
  transports: ["websocket"],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const messageMapping = {};

io.on("connection", (socket) => {
  socket.on("sendMessage", (message) => {
    const roomId = message.roomId;

    const finalMessage = {
      ...message,
      messageId: nanoid(),
    };
    if (!messageMapping[roomId]) {
      messageMapping[roomId] = [];
    }
    messageMapping[roomId].push(finalMessage);
    io.to(roomId).emit("roomMessage", finalMessage);
  });

  socket.on("sendTypingIndicator", (message) => {
    const { roomId } = message;
    io.to(roomId).emit("userTyping", message);
  });

  socket.on("joinRoomExclusively", (room) => {
    if (room >= 1 && room <= 10) {
      socket.rooms.forEach((roomIamPartOf) => {
        if (roomIamPartOf !== socket.id) {
          socket.leave(roomIamPartOf);
        }
      });

      socket.join(room);

      const messages = messageMapping[room] || [];
      messages.forEach((message) => {
        socket.emit("roomMessage", message);
      });
    } else {
      socket.emit("You have requested the wrong room");
    }
  });
});

setInterval(() => {
  io.to("Room1").emit("date", new Date().toString());
  io.to("Room2").emit("random", Math.floor(Math.random() * 1000));
}, 1000);
