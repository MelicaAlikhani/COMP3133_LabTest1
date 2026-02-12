console.log("JS LOADED");

const socket = io();

let currentRoom = "";
let currentUser = "";

const joinBtn = document.getElementById("joinBtn");
const sendBtn = document.getElementById("sendBtn");

joinBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const room = document.getElementById("room").value;

  if (!username || !room) return alert("Enter username and room");

  currentUser = username;
  currentRoom = room;

  socket.emit("joinRoom", { username, room });
});

sendBtn.addEventListener("click", () => {
  const message = document.getElementById("message").value;

  if (!message) return;

  socket.emit("chatMessage", {
    username: currentUser,
    room: currentRoom,
    text: message
  });

  document.getElementById("message").value = "";
});

socket.on("message", (data) => {
  const messagesDiv = document.getElementById("messages");

  const p = document.createElement("p");
  p.innerHTML = `<strong>${data.username}:</strong> ${data.text}`;

  messagesDiv.appendChild(p);
});
