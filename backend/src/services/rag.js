import * as faiss from "faiss-node";
import { getEmbedding } from "./embeddings.js";
import { geminiGenerate } from "./gemini.js";
import { basePrompt } from "../prompts/chatbotPrompt.js";
import { saveChatLog } from "./db.js";

let index;

// Build FAISS index
export async function initFaiss(docs) {
  const vectors = await Promise.all(docs.map(d => getEmbedding(d.text)));
  index = new faiss.IndexFlatL2(vectors[0].length);
  vectors.forEach((vec, i) => index.add(vec, i));
  return index;
}

// Query pipeline
export async function queryRAG(userId, query, orgId) {
  const queryVec = await getEmbedding(query);
  const topK = 3;
  const results = index.search(queryVec, topK);

  const retrievedDocs = results.map(r => docs[r.index].text).join("\n");

  const prompt = `${basePrompt}
User Query: ${query}
Context (from FAQs): ${retrievedDocs}
Answer in English or Tamil/Tanglish depending on input.`

  const response = await geminiGenerate(prompt);

  // Detect agent request
  if (/connect.*agent/i.test(query)) {
    await notifyAgentSlack(userId, query);
    return { answer: "Connecting you to an agent...", connect_agent: true };
  }

  // Log
  await saveChatLog(userId, query, response, orgId);

  return { answer: response, connect_agent: false };
}
