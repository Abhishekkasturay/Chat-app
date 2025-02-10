import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { produce, enableMapSet } from "immer";

enableMapSet();

const socketURL = process.env.REACT_APP_SOCKET_URL || "https://chat-app-6-ams3.onrender.com"; 

export default function App() {
  const [mySocket, setMySocket] = useState(null);
  const [roomIdToMapping, setRoomIdToMapping] = useState({});
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");
  const isPromptAlert = useRef(false);
  const [userTypingMapping, setUserTypingMapping] = useState({});
  const [userTypingTimeOutMapping, setUserTypingTimeOutMapping] = useState({});

useEffect(() => {
  if (!isPromptAlert.current) {
    isPromptAlert.current = true;
    let validUserName = "";
    while (!validUserName?.trim()) {
      validUserName = window.prompt("Enter your Name");
    }
    setUserName(validUserName);
  }

    

    const socket = io(socketURL, {
      transports: ["websocket"],
    });

    setMySocket(socket);

    socket.on("roomMessage", (data) => {
      setRoomIdToMapping(
        produce((state) => {
          state[data.roomId] = state[data.roomId] || [];
          if (!state[data.roomId].some((obj) => obj.messageId === data.messageId)) {
            state[data.roomId].push(data);
          }
        })
      );
    });

    socket.on("userTyping", (data) => {
      const { roomId, userName } = data;

      setUserTypingMapping(
        produce((state) => {
          state[roomId] = state[roomId] || new Set();
          state[roomId].add(userName);
        })
      );

      const timeOutId = setTimeout(() => {
        setUserTypingMapping(
          produce((state) => {
            state[roomId] = state[roomId] || new Set();
            state[roomId].delete(userName);
          })
        );
      }, 5000);
      setUserTypingTimeOutMapping(
        produce((state) => {
          clearTimeout(state[roomId + "-" + userName]);
          state[roomId + "-" + userName] = timeOutId;
        })
      );
    });

    return () => {
      socket.close();
    };
  }, []);

  function joinRoomExclusively(roomId) {
    if (mySocket == null) return;

    setActiveRoomId(roomId);

    mySocket.emit("joinRoomExclusively", roomId);
  }

  function sendMessage() {
    if (mySocket == null) return;
    if (typeof activeRoomId !== "number") {
      alert("Please select a room before sending a message");
      return;
    }
    mySocket.emit("sendMessage", { roomId: activeRoomId, message, userName });
    setMessage("");
  }

  function sendTypingIndicator() {
    if (mySocket == null) return;
    if (typeof activeRoomId !== "number") {
      alert("Please select a room before sending a message");
      return;
    }
    mySocket.emit("sendTypingIndicator", { roomId: activeRoomId, userName });
  }

  if (mySocket == null) return null;

  const messageOfRoom = roomIdToMapping[activeRoomId] || [];
  const typingUserInRoom =
    userTypingMapping[activeRoomId] != null
      ? [...userTypingMapping[activeRoomId]]
      : [];

  return (
  <div className="grid grid-cols-12 divide-x divide-gray-200 min-h-screen">
  {/* Sidebar */}
  <aside className="col-span-4 p-6 bg-gray-50 h-screen overflow-y-auto border-r border-gray-200">
    <h1 className="text-lg font-semibold text-gray-700 mb-4">Chat Rooms</h1>
    {Array(10)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg cursor-pointer transition ${
            activeRoomId === i + 1
              ? "bg-indigo-600 text-white shadow-md"
              : "hover:bg-gray-100"
          }`}
          onClick={() => joinRoomExclusively(i + 1)}
        >
          Room #{i + 1}
        </div>
      ))}
  </aside>

  {/* Main Chat Section */}
  <main className="col-span-8 flex flex-col h-screen bg-white">
    {/* Chat Header */}
    <div className="px-8 py-4 bg-gray-100 border-b border-gray-200">
      <p className="text-gray-700 font-medium">Your username: {userName}</p>
      {typingUserInRoom.length > 0 && (
        <p className="text-sm text-indigo-500">Typing: {typingUserInRoom.join(",")}</p>
      )}
    </div>

    {/* Chat Messages */}
    <div className="flex-grow overflow-y-auto p-6 space-y-4">
      {messageOfRoom.map(({ message, userName }, index) => (
        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          <b className="text-indigo-600">Sent by {userName}</b>
          <p className="text-gray-700">{message}</p>
        </div>
      ))}
    </div>

    {/* Chat Input */}
    <div className="px-8 py-4 bg-gray-100 border-t border-gray-200 flex items-center gap-4">
      <textarea
        id="about"
        name="about"
        rows="2"
        className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 resize-none"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => {
          sendTypingIndicator();
          setMessage(e.target.value);
        }}
      />
      <button
        type="button"
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition"
        onClick={sendMessage}
      >
        Send
      </button>
    </div>
  </main>
</div>

  );
}
