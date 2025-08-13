import { Server } from "socket.io";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/realTimeMessages.js";

export const onlineUsers = new Map(); // Move it to top-level and export

export function setupSocket(server) {
  const io = new Server(server, {
    path: "/socket.io/",
    cors: {
      origin: "https://frontend-youtube-tghl.vercel.app", // ✅ must match your frontend
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

    socket.on("sendMessage", async ({ from, to, text, mediaUrl, mediaType }) => {
      console.log("Message from client:", { from, to, text, mediaUrl, mediaType });

      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [from, to], $size: 2 }
      });
      if (!conversation) {
        conversation = await Conversation.create({ participants: [from, to] });
      }

      // Save message in DB
      const savedMessage = await Message.create({
        conversation: conversation._id,
        from,
        to,
        text,
        mediaUrl,
        mediaType,
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: savedMessage._id,
        updatedAt: new Date(),
      });

      // Emit to recipient if online
      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        await Message.findByIdAndUpdate(savedMessage._id, { delivered: true });
        io.to(recipientSocketId).emit("message", { from, to, text, mediaUrl, mediaType });
        console.log(`Delivered to ${to}`);
      } else {
        console.log(`User ${to} offline. Message saved in DB only.`);
      }

      // Optionally send ack back to sender
      socket.emit("message", { from, to, text, mediaUrl, mediaType });
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
