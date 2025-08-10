import { createConsumer } from "./client.js";
import { Message } from "../models/realTimeMessages.js";
import { Conversation } from "../models/conversation.model.js";

export async function startMessageConsumer(io, onlineUsers) {
  console.log("Consumer is running..");
  const consumer = createConsumer({ groupId: "default" });
  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });

  await consumer.run({
    autoCommit: true,
    eachMessage: async ({ message, pause }) => {
      if (!message || !message.value) return;
      const value = message.value.toString();
      console.log(`New Message Recv..`, value);
      try {

        const { from, to, text, mediaUrl, mediaType } = JSON.parse(value);


        let conversation = await Conversation.findOne({
          participants: { $all: [from, to], $size: 2 }
        });
        if (!conversation) {
          conversation = await Conversation.create({ participants: [from, to] });
        }

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

        // Deliver only if recipient is online
        const recipientSocketId = onlineUsers.get(to);
        console.log("Current onlineUsers:", Array.from(onlineUsers.entries()));
        if (recipientSocketId) {
          await Message.findByIdAndUpdate(savedMessage._id, { delivered: true });
          io.to(recipientSocketId).emit("message", { from, to, text });
          console.log(`Delivered to ${to}`);
        } else {
          console.log(`User ${to} offline. Message saved in DB only.`);
        }

        const senderSocketId = onlineUsers.get(from);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message", { from, to, text });
        }

      } catch (err) {
        console.log("Something is wrong", err);
        pause();
        setTimeout(() => {
          consumer.resume([{ topic: "MESSAGES" }]);
        }, 60 * 1000);
      }
    },
  });
}