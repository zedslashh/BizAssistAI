import express from "express";
import { getEmbedding } from "../services/embeddings.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import fetch from "node-fetch"; // for calling agent notify

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// connect MongoDB
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db("chatbot");
const faqCollection = db.collection("faqs");
const logsCollection = db.collection("logs");

// POST /chat/query
router.post("/query", async (req, res) => {
  const { message, orgId, userId } = req.body;

  try {
    // 1. Get embedding of user query
    const queryEmbedding = await getEmbedding(message);

    // 2. Find nearest FAQ in Mongo
    const faqs = await faqCollection.find({ orgId }).toArray();
    let bestMatch = null;
    let bestScore = -1;

    for (const faq of faqs) {
      if (!faq.embedding) continue;
      // cosine similarity
      const score =
        dotProduct(queryEmbedding, faq.embedding) /
        (magnitude(queryEmbedding) * magnitude(faq.embedding));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    let responseText = "";
    let confidence = bestScore;

    // 3. If confident enough, return FAQ answer
    if (bestMatch && bestScore > 0.7) {
      responseText = bestMatch.answer;
    } else {
      // 4. Else use Gemini LLM
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat();
      const result = await chat.sendMessage(
        `User asked: "${message}". If you know the answer, reply concisely.`
      );
      responseText = result.response.text();

      // 5. If Gemini response still low confidence → notify agent
      if (!responseText || responseText.trim().length < 5) {
        await fetch("http://localhost:5000/agent/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: message,
            orgId,
            confidence: bestScore,
          }),
        });
        responseText = "I’ve forwarded your query to a human agent.";
      }
    }

    // 6. Log conversation
    await logsCollection.insertOne({
      orgId,
      userId,
      message,
      response: responseText,
      confidence,
      createdAt: new Date(),
    });

    res.json({ response: responseText, confidence });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// --- Helper math funcs ---
function dotProduct(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}
function magnitude(vec) {
  return Math.sqrt(dotProduct(vec, vec));
}

export default router;
