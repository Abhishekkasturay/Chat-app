const socket = io("ws://localhost:3001", {
  transports: ["websocket"],
});

// Client-side event handler for "talk-to-client" event
socket.on("talk-to-client", (message, callback) => {
  const messageDiv = document.getElementById("messages"); // Moved inside the event handler

  const div = document.createElement("div");
  div.className = "message";
  div.textContent = message;

  messageDiv.appendChild(div);
  callback("Client did the work");
});

document.getElementById("send-message").addEventListener("click", async () => {
  const value = document.getElementById("message-input").value;

  try {
    const response = await new Promise((resolve, reject) => {
      socket.emit("talk-to-server", value, (acknowledgment) => {
        resolve(acknowledgment);
      });
      setTimeout(() => {
        reject(new Error("Timeout exceeded"));
      }, 10000); // Adjust timeout as needed
    });

    console.log("Acknowledgment received:", response);
  } catch (err) {
    console.error("Error or timeout:", err);
  }
});

document.getElementById("toggle-Room1").addEventListener("click", () => {
  socket.emit("toggleRoom", "Room1");
});

document.getElementById("toggle-Room2").addEventListener("click", () => {
  socket.emit("toggleRoom", "Room2");
});
