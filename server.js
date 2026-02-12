require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketio = require("socket.io");

const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use("/api", authRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Socket connection
io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
