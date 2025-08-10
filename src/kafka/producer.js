import { createProducer } from "./client.js";

let producer = null;

async function getProducer() {
  if (producer) return producer;
  producer = createProducer();
  await producer.connect();
  return producer;
}

export async function produceMessage(message) {
  const producer = await getProducer();
  await producer.send({
    topic: "MESSAGES",
    messages: [{ 
      key: `message-${Date.now()}`,
      value: message,
       }],
  });
  return true;
}