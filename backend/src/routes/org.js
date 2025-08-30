import express from "express";
import { db } from "../index.js";
import { verifyFirebaseToken } from "./auth.js";

const router = express.Router();

router.post("/register", verifyFirebaseToken, async (req, res) => {
  const { name, email, vertical, method, languages } = req.body;
  const org = { name, email, vertical, method, languages, createdAt: new Date() };
  const result = await db.collection("organizations").insertOne(org);
  res.json({ orgId: result.insertedId });
});

export default router;
