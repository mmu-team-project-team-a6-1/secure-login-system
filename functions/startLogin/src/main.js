import { Client, Databases, ID, Query } from "node-appwrite";
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

    const now = Date.now();
    const ttlMs =
      Number.parseInt(process.env.LOGIN_REQUEST_TTL_MS ?? "", 10) || 120000;
    const expiresAt = now + ttlMs;
    const token = crypto.randomBytes(24).toString("hex");

    // Optionally expire any existing PENDING requests for this username
    try {
      const existing = await databases.listDocuments(
        process.env.DB_ID,
        process.env.COLLECTION_ID,
        [Query.equal("username", username), Query.equal("status", "PENDING")]
      );

      await Promise.all(
        existing.documents.map((doc) =>
          databases.updateDocument(
            process.env.DB_ID,
            process.env.COLLECTION_ID,
            doc.$id,
            { status: "EXPIRED" }
          )
        )
      );
    } catch (cleanupErr) {
      // Log but do not fail the whole request for cleanup issues
      log?.(
        `cleanup_error: ${
          cleanupErr?.message ? String(cleanupErr.message) : String(cleanupErr)
        }`
      );
    }

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
      expiresInSeconds: Math.round(ttlMs / 1000)
    });
  } catch (err) {
    log(err?.message || String(err));
    return res.json({ error: "server error" }, 500);
  }
};