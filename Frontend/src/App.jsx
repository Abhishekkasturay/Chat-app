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
  const [isPrompted, setIsPrompted] = useState(false);
  const [userTypingMapping, setUserTypingMapping] = useState({});
  const [userTypingTimeOutMapping, setUserTypingTimeOutMapping] = useState({});

  useEffect(() => {
  if (!isPrompted) {
    setIsPrompted(true);
    let ValidUserName;
    do {
      ValidUserName = window.prompt("Enter your Name (Press Cancel to Exit)");
      if (ValidUserName === null) return;
    } while (!ValidUserName?.trim());

    setUserName(ValidUserName);
  }
}, [isPrompted]);

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
    <div className="grid grid-cols-12 divide-x divide-gray-300">
      <aside className="col-span-4 px-8 h-screen overflow-y-auto">
        <h1>Sidebar</h1>
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <div
              className={`p-2 cursor-pointer ${
                activeRoomId === i + 1
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
              key={i}
              onClick={() => joinRoomExclusively(i + 1)}
            >
              Room #{i + 1}
            </div>
          ))}
      </aside>
      <main className="col-span-8 px-8 h-screen overflow-y-auto flex flex-col">
        <p>Your username: {userName}</p>
        {typingUserInRoom.length > 0 ? (
          <p>Typing: {typingUserInRoom.join(",")}</p>
        ) : null}
        {messageOfRoom.map(({ message, userName }, index) => (
          <div className="w-full px-4 py-4" key={index}>
            <b>Sent by {userName}</b>
            <p>{message}</p>
          </div>
        ))}
        <div className="flex-grow" />
        <div className="mb-8 flex justify-center items-center gap-2">
          <textarea
            id="about"
            name="about"
            rows="2"
            className="block w-full mb-8 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 flex-grow"
            value={message}
            onChange={(e) => {
              sendTypingIndicator();
              setMessage(e.target.value);
            }}
          />
          <button
            type="button"
            className="flex-shrink-0 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={sendMessage}
          >
            Send Message
          </button>
        </div>
      </main>
    </div>
  );
}
