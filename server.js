require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");

const Message = require("./models/Message");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/api", authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const activeUsers = {};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.user.username);

  socket.on("joinRoom", async ({ room }) => {
    const username = socket.user.username;

    socket.join(room);
    activeUsers[socket.id] = { username, room };

    const previousMessages = await Message.find({ room }).sort({ createdAt: 1 });
    socket.emit("previousMessages", previousMessages);

    io.to(room).emit("message", {
      username: "System",
      text: `${username} has joined the room`
    });
  });

  socket.on("chatMessage", async ({ text }) => {
    const user = activeUsers[socket.id];
    if (!user) return;

    const newMessage = new Message({
      username: user.username,
      room: user.room,
      text
    });

    await newMessage.save();

    io.to(user.room).emit("message", newMessage);
  });

  socket.on("typing", () => {
    const user = activeUsers[socket.id];
    if (!user) return;

    socket.to(user.room).emit("typing", user.username);
  });

  socket.on("leaveRoom", () => {
    const user = activeUsers[socket.id];
    if (!user) return;

    socket.leave(user.room);

    io.to(user.room).emit("message", {
      username: "System",
      text: `${user.username} has left the room`
    });

    delete activeUsers[socket.id];
  });

  socket.on("disconnect", () => {
    const user = activeUsers[socket.id];
    if (!user) return;

    io.to(user.room).emit("message", {
      username: "System",
      text: `${user.username} disconnected`
    });

    delete activeUsers[socket.id];
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
