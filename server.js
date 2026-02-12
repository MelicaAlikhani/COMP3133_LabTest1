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

const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    const token = req.headers.authorization;

    if (!token) return res.status(401).json({ message: "Access denied" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid token" });
    }
}
app.get("/protected", authenticate, (req, res) => {
    res.json({ message: "Secure data" });
});


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
