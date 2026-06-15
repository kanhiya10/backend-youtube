import { Server } from "socket.io";
import { produceMessage } from "../kafka/producer.js";

export const onlineUsers = new Map(); // Move it to top-level and export

export function setupSocket(server) {
  const io = new Server(server, {
     path: "/socket.io/",
    cors: {
     origin: true, 
     methods: ["GET", "POST"],
     credentials: true,  
    },
  });

  console.log("Socket.IO server initialized");

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
      console.log("Current onlineUsers:", Array.from(onlineUsers.entries()));
    });

    socket.on("sendMessage", async ({ from, to, text,mediaUrl, mediaType }) => {
      console.log("Message from client:", { from, to, text,mediaUrl, mediaType });


      await produceMessage(JSON.stringify({ from, to, text,mediaUrl, mediaType }));
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
}