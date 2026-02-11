require("dotenv").config();

const Message = require("./models/Message");
const Room = require("./models/Room");
const User = require("./models/User");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Attach socket.io
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));


// SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

 socket.on("joinRoom", (room) => {
  socket.join(room);

  io.to(room).emit("receiveMessage", {
    message: "A user joined the room"
  });
});
 socket.on("sendMessage", async ({ room, message }) => {
  const newMessage = await Message.create({
    room,
    message
  });
  io.to(room).emit("receiveMessage", newMessage);
});
 socket.on("disconnect", () => {
  console.log("User disconnected");
});

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.use(express.static("public"));
app.use(express.json());
