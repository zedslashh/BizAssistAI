import express from "express";
import admin from "firebase-admin";

const router = express.Router();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// Middleware
export async function verifyFirebaseToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

router.get("/me", verifyFirebaseToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
