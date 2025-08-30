import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

import authRoutes from "./routes/auth.js";
import orgRoutes from "./routes/org.js";
import faqRoutes from "./routes/faq.js";
import chatRoutes from "./routes/chat.js";
import agentRoutes from "./routes/agent.js";
app.use("/chat", chatRoutes);


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// MongoDB
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
export const db = client.db("chatbot_saas");

// Routes
app.use("/auth", authRoutes);
app.use("/org", orgRoutes);
app.use("/faq", faqRoutes);
app.use("/chat", chatRoutes);
app.use("/agent", agentRoutes);

app.listen(5000, () => console.log("🚀 Backend running at http://localhost:5000"));
