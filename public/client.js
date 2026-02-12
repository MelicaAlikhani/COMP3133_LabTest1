const socket = io();

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const joinBtn = document.getElementById("joinBtn");
  const leaveBtn = document.getElementById("leaveBtn");
  const sendBtn = document.getElementById("sendBtn");
  const roomInput = document.getElementById("roomInput");
  const messageInput = document.getElementById("messageInput");
  const messagesDiv = document.getElementById("messages");

  let currentRoom = "";

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });

  joinBtn.addEventListener("click", () => {
    const room = roomInput.value.trim();
    if (!room) return;

    currentRoom = room;
    socket.emit("joinRoom", { room, token });
  });

  leaveBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    socket.emit("leaveRoom", { room: currentRoom });
    currentRoom = "";
  });

  sendBtn.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;

    socket.emit("chatMessage", {
      text: message,
      room: currentRoom,
      token
    });

    messageInput.value = "";
  });

  socket.on("message", (msg) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${msg.username}:</strong> ${msg.text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  socket.on("systemMessage", (msg) => {
    const div = document.createElement("div");
    div.innerHTML = `<em>${msg}</em>`;
    messagesDiv.appendChild(div);
  });

});
