document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const roomSelect = document.getElementById("roomSelect");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");

  const messagesEl = document.getElementById("messages");
  const typingEl = document.getElementById("typingIndicator");

  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  const userSelect = document.getElementById("userSelect");
  const privateInput = document.getElementById("privateInput");
  const privateBtn = document.getElementById("privateBtn");

  const logoutBtn = document.getElementById("logoutBtn");

  const socket = io({
    auth: { token },
    transports: ["websocket", "polling"],
  });

  let currentRoom = null;
  let typingTimeout = null;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage({ username, text, createdAt }, cssClass = "") {
    const div = document.createElement("div");
    div.className = `msg ${cssClass}`.trim();

    const time = createdAt ? new Date(createdAt).toLocaleTimeString() : "";
    div.innerHTML = `<strong>${username}:</strong> ${text} <span style="color:#9ca3af;font-size:12px">${time}</span>`;

    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function setTyping(username, isTyping) {
    if (!isTyping) {
      typingEl.textContent = "";
      return;
    }
    typingEl.textContent = `${username} is typing...`;
  }

  function refreshUserDropdown(users) {
    const myUsername = localStorage.getItem("username") || "";

    const selected = userSelect.value;
    userSelect.innerHTML = `<option value="">Select user</option>`;

    users
      .filter((u) => u && u !== myUsername)
      .forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u;
        opt.textContent = u;
        userSelect.appendChild(opt);
      });

    if ([...userSelect.options].some((o) => o.value === selected)) {
      userSelect.value = selected;
    }
  }

  socket.on("connect_error", (err) => {
    console.log("Socket connect error:", err.message);
  });

  socket.on("loadMessages", (messages) => {
    messagesEl.innerHTML = "";
    messages.forEach((m) => {
      addMessage(m, m.username === "System" ? "system" : "");
    });
  });

  socket.on("message", (msg) => {
    addMessage(msg, msg.username === "System" ? "system" : "");
  });

  socket.on("typing", ({ username, isTyping }) => {
    setTyping(username, isTyping);
  });

  socket.on("roomUsers", (users) => {
    refreshUserDropdown(users);
  });

  socket.on("privateMessage", (pm) => {
    const div = document.createElement("div");
    div.className = "msg private";
    const time = pm.createdAt ? new Date(pm.createdAt).toLocaleTimeString() : "";
    div.innerHTML = `<strong>Private</strong> from <strong>${pm.from}</strong> to <strong>${pm.to}</strong>: ${pm.text}
      <span style="color:#9ca3af;font-size:12px">${time}</span>`;
    messagesEl.appendChild(div);
    scrollToBottom();
  });

  joinRoomBtn.addEventListener("click", () => {
    const room = roomSelect.value;
    if (!room) return;

    currentRoom = room;
    socket.emit("joinRoom", room);
  });

  leaveRoomBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    socket.emit("leaveRoom");
    currentRoom = null;
    typingEl.textContent = "";
    refreshUserDropdown([]);
  });

  sendBtn.addEventListener("click", () => {
    const text = messageInput.value.trim();
    if (!text || !currentRoom) return;

    socket.emit("sendMessage", { room: currentRoom, text });
    messageInput.value = "";
    socket.emit("typing", { room: currentRoom, isTyping: false });
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  messageInput.addEventListener("input", () => {
    if (!currentRoom) return;

    socket.emit("typing", { room: currentRoom, isTyping: true });

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", { room: currentRoom, isTyping: false });
    }, 800);
  });

  privateBtn.addEventListener("click", () => {
    const toUsername = userSelect.value;
    const text = privateInput.value.trim();
    if (!toUsername || !text) return;

    socket.emit("sendPrivateMessage", { toUsername, text });
    privateInput.value = "";
  });

  privateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") privateBtn.click();
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login.html";
  });
});
