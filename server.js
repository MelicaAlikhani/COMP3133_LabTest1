require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const Message = require("./models/Message");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const onlineUsers = new Map(); // socketId -> { username, room }
const usernameToSocketId = new Map(); // username -> socketId

function emitRoomUsers(room) {
  const users = [];
  for (const [, u] of onlineUsers) {
    if (u.room === room) users.push(u.username);
  }
  io.to(room).emit("roomUsers", users);
}

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Unauthorized"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { username: payload.username, id: payload.id };
    next();
  } catch (e) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const username = socket.user?.username;
  onlineUsers.set(socket.id, { username, room: null });
  usernameToSocketId.set(username, socket.id);

  socket.on("joinRoom", async (room) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;

    if (user.room) {
      socket.leave(user.room);
      const oldRoom = user.room;
      user.room = null;
      emitRoomUsers(oldRoom);
    }

    user.room = room;
    socket.join(room);

    const systemText = `${username} joined ${room}`;
    const systemMsg = await Message.create({
      username: "System",
      room,
      text: systemText,
    });

    io.to(room).emit("message", systemMsg);

    const messages = await Message.find({ room })
      .sort({ createdAt: 1 })
      .limit(50);

    socket.emit("loadMessages", messages);
    emitRoomUsers(room);
  });

  socket.on("leaveRoom", async () => {
    const user = onlineUsers.get(socket.id);
    if (!user?.room) return;

    const room = user.room;
    socket.leave(room);
    user.room = null;

    const systemText = `${username} left ${room}`;
    const systemMsg = await Message.create({
      username: "System",
      room,
      text: systemText,
    });

    io.to(room).emit("message", systemMsg);
    emitRoomUsers(room);
  });

  socket.on("sendMessage", async ({ room, text }) => {
    if (!room || !text || !text.trim()) return;

    const user = onlineUsers.get(socket.id);
    if (!user?.room || user.room !== room) return;

    const msg = await Message.create({
      username,
      room,
      text: text.trim(),
    });

    io.to(room).emit("message", msg);
  });

  socket.on("typing", ({ room, isTyping }) => {
    if (!room) return;
    socket.to(room).emit("typing", { username, isTyping: !!isTyping });
  });

  socket.on("sendPrivateMessage", async ({ toUsername, text }) => {
    if (!toUsername || !text || !text.trim()) return;

    const toSocketId = usernameToSocketId.get(toUsername);
    if (!toSocketId) {
      socket.emit("privateMessage", {
        from: "System",
        to: username,
        text: `User "${toUsername}" is not online.`,
        createdAt: new Date(),
      });
      return;
    }

    const pm = await PrivateMessage.create({
      from: username,
      to: toUsername,
      text: text.trim(),
    });

    socket.emit("privateMessage", pm);
    io.to(toSocketId).emit("privateMessage", pm);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user?.room) emitRoomUsers(user.room);

    onlineUsers.delete(socket.id);
    if (usernameToSocketId.get(username) === socket.id) {
      usernameToSocketId.delete(username);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
