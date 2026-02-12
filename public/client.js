const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token || !username) {
  window.location.href = "/login.html";
}

const socket = io({
  auth: { token },
});

const roomSelect = document.getElementById("roomSelect");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatBox = document.getElementById("chatBox");
const privateUserInput = document.getElementById("privateUser");
const privateMessageInput = document.getElementById("privateMessage");
const sendPrivateBtn = document.getElementById("sendPrivateBtn");
const logoutBtn = document.getElementById("logoutBtn");

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addMessage(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addSystem(text) {
  const clean = typeof text === "string" ? text.trim() : "";
  if (!clean) return;
  addMessage(`<em>System: ${escapeHtml(clean)}</em>`);
}

joinBtn.addEventListener("click", () => {
  const room = roomSelect.value;
  if (!room) return;
  chatBox.innerHTML = "";
  socket.emit("joinRoom", { room });
});

leaveBtn.addEventListener("click", () => {
  socket.emit("leaveRoom");
});

sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("chatMessage", { text });
  messageInput.value = "";
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

sendPrivateBtn.addEventListener("click", () => {
  const to = privateUserInput.value.trim();
  const text = privateMessageInput.value.trim();
  if (!to || !text) return;

  socket.emit("privateMessage", { to, text });
  privateMessageInput.value = "";
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login.html";
});

socket.on("connect_error", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login.html";
});

socket.on("previousMessages", (messages) => {
  if (!Array.isArray(messages)) return;

  messages.forEach((msg) => {
    addMessage(
      `<strong>${escapeHtml(msg.username)}:</strong> ${escapeHtml(msg.text)}`
    );
  });
});

socket.on("chatMessage", (msg) => {
  if (!msg || typeof msg.text !== "string") return;

  addMessage(
    `<strong>${escapeHtml(msg.username)}:</strong> ${escapeHtml(msg.text)}`
  );
});

socket.on("systemMessage", (payload) => {
  const text = typeof payload === "string" ? payload : payload?.text;
  addSystem(text);
});

socket.on("privateMessage", ({ to, from, text }) => {
  if (!to || !from || !text) return;
  if (to !== username && from !== username) return;

  addMessage(
    `<span style="color:purple;"><strong>Private ${escapeHtml(
      from
    )} → ${escapeHtml(to)}:</strong> ${escapeHtml(text)}</span>`
  );
});
