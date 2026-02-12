require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/api", authRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);

    io.to(room).emit("message", {
      username: "System",
      text: `${username} has joined the room`
    });
  });

  socket.on("leaveRoom", ({ username, room }) => {
    socket.leave(room);

    io.to(room).emit("message", {
      username: "System",
      text: `${username} has left the room`
    });
  });

  socket.on("chatMessage", ({ username, room, text }) => {
    io.to(room).emit("message", { username, text });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
