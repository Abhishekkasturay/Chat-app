import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { nanoid } from "nanoid";
import cors from "cors";

const app = express();
app.use(express.static("./public"));

// Enable CORS for your frontend URL
const corsOptions = {
  origin: "https://chat-app-5-d0z6.onrender.com", 
  methods: ["GET", "POST"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// HTTP and WebSocket server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ["websocket"],
  cors: corsOptions,
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const messageMapping = {};

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

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
      socket.emit("error", "You have requested the wrong room");
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

setInterval(() => {
  io.to("Room1").emit("date", new Date().toString());
  io.to("Room2").emit("random", Math.floor(Math.random() * 1000));
}, 1000);
