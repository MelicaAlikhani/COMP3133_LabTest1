require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const path = require("path");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/authRoutes");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

function requireHttpAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenFromHeader = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const tokenFromQuery = req.query.token || null;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) return res.status(401).send("Unauthorized");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).send("Unauthorized");
  }
}

app.get("/chat.html", requireHttpAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

const userSockets = new Map();

function addUserSocket(username, socketId) {
  if (!userSockets.has(username)) userSockets.set(username, new Set());
  userSockets.get(username).add(socketId);
}

function removeUserSocket(username, socketId) {
  const set = userSockets.get(username);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(username);
}

function emitToUser(username, event, payload) {
  const set = userSockets.get(username);
  if (!set) return;
  for (const id of set) {
    io.to(id).emit(event, payload);
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const username = socket.user?.username;
  if (username) addUserSocket(username, socket.id);

  socket.on("joinRoom", async ({ room }) => {
    if (!room || !username) return;

    if (socket.room) {
      io.to(socket.room).emit("systemMessage", {
        text: `${username} left ${socket.room}`,
      });
      socket.leave(socket.room);
      socket.room = null;
    }

    socket.join(room);
    socket.room = room;

    io.to(room).emit("systemMessage", {
      text: `${username} joined ${room}`,
    });

    try {
      const messages = await Message.find({ room }).sort({ createdAt: 1 });
      socket.emit("previousMessages", messages);
    } catch {
      socket.emit("systemMessage", { text: "Error loading previous messages" });
    }
  });

  socket.on("leaveRoom", () => {
    if (!socket.room || !username) return;

    const room = socket.room;

    io.to(room).emit("systemMessage", {
      text: `${username} left ${room}`,
    });

    socket.leave(room);
    socket.room = null;
  });

  socket.on("chatMessage", async ({ text }) => {
    const room = socket.room;
    if (!room || !username) return;

    const cleanText = typeof text === "string" ? text.trim() : "";
    if (!cleanText) return;

    try {
      const message = new Message({ room, username, text: cleanText });
      await message.save();
      io.to(room).emit("chatMessage", message);
    } catch {
      socket.emit("systemMessage", { text: "Error sending message" });
    }
  });

  socket.on("privateMessage", ({ to, text }) => {
    if (!username) return;

    const cleanTo = typeof to === "string" ? to.trim() : "";
    const cleanText = typeof text === "string" ? text.trim() : "";

    if (!cleanTo || !cleanText) return;

    const payload = { to: cleanTo, from: username, text: cleanText };

    emitToUser(cleanTo, "privateMessage", payload);
    emitToUser(username, "privateMessage", payload);
  });

  socket.on("disconnect", () => {
    if (socket.room && username) {
      io.to(socket.room).emit("systemMessage", {
        text: `${username} left ${socket.room}`,
      });
    }
    if (username) removeUserSocket(username, socket.id);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
