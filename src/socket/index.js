import { Server } from "socket.io";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/realTimeMessages.js";

export const onlineUsers = new Map(); // Move it to top-level and export

export function setupSocket(server) {
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: true, 
      methods: ["GET", "POST"],    
      credentials: true,
    },
  });


  io.on("connection", (socket) => {

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on("sendMessage", async ({ from, to, text, mediaUrl, mediaType }) => {

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
      } else {
      }

      // Optionally send ack back to sender
      socket.emit("message", { from, to, text, mediaUrl, mediaType });
    });


    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}
