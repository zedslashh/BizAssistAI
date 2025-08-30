import express from "express";
import multer from "multer";
import { processFaqUpload } from "../services/faqParser.js";
import { db } from "../index.js";
import { verifyFirebaseToken } from "./auth.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", verifyFirebaseToken, upload.single("file"), async (req, res) => {
  const faqs = await processFaqUpload(req.file);
  await db.collection("faqs").insertMany(faqs);
  res.json({ uploaded: faqs.length });
});

export default router;
