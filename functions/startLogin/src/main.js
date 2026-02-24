import { Client, Databases, ID } from "node-appwrite";
import crypto from "crypto";

export default async ({ req, res, log }) => {
  try {
    const body = req.bodyJson ?? {};
    const username = body.username;

    if (!username || typeof username !== "string") {
      return res.json({ error: "username is required" }, 400);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const token = crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const expiresAt = now + 120000; // 2 minutes

    const doc = await databases.createDocument(
      process.env.DB_ID,
      process.env.COLLECTION_ID,
      ID.unique(),
      {
        username,
        token,
        status: "PENDING",
        createdAt: now,
        expiresAt
      }
    );

    const approveUrl = `${process.env.FRONTEND_BASE_URL}/approve?token=${token}`;

    return res.json({
      requestId: doc.$id,
      approveUrl,
      qrUrl: approveUrl,
      expiresInSeconds: 120
    });
  } catch (err) {
    log(err?.message || String(err));
    return res.json({ error: "server error" }, 500);
  }
};