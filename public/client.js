console.log("JS LOADED");

const socket = io();

// Check login
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

let currentRoom = "";
let username = "";

// Decode token to get username
try {
  const payload = JSON.parse(atob(token.split(".")[1]));
  username = payload.username;
} catch (err) {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// DOM elements
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const roomInput = document.getElementById("room");
const messageInput = document.getElementById("message");
const messagesDiv = document.getElementById("messages");

// JOIN ROOM
joinBtn.addEventListener("click", () => {
  const room = roomInput.value.trim();
  if (!room) return;

  currentRoom = room;

  socket.emit("joinRoom", {
    username,
    room
  });
});

// LEAVE ROOM
leaveBtn.addEventListener("click", () => {
  if (!currentRoom) return;

  socket.emit("leaveRoom", {
    username,
    room: currentRoom
  });

  currentRoom = "";
});

// SEND MESSAGE
sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text || !currentRoom) return;

  socket.emit("chatMessage", {
    username,
    room: currentRoom,
    text
  });

  messageInput.value = "";
});

// RECEIVE MESSAGE
socket.on("message", (msg) => {
  const p = document.createElement("p");
  p.innerHTML = `<strong>${msg.username}:</strong> ${msg.text}`;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// LOGOUT
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});
