require("dotenv").config();
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use(express.static("public"));

// Socket connection
io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);

    io.to(room).emit("message", {
      username: "System",
      text: `${username} has joined the room`
    });
  });

  socket.on("chatMessage", async ({ username, room, text }) => {
    console.log("Message received:", text);

    const newMessage = new Message({
      username,
      room,
      text
    });

    await newMessage.save();

    io.to(room).emit("message", {
      username,
      text
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
