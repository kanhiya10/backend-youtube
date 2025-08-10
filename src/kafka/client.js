// kafka/client.js
import { Kafka } from "kafkajs";

export const kafka = new Kafka({
  clientId: "chat-service",
  brokers: ['kafka:9092'], // Update if running in Docker Compose
});

export const createProducer = () => kafka.producer();
export const createConsumer = (options) => kafka.consumer(options);