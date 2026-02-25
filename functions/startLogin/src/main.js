import { Client, Databases } from "node-appwrite";
import crypto from "crypto";

export default async ({ req, res, log, error }) => {
  try {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.DATABASE_ID;
    const tableId = process.env.TABLE_ID;

    if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
      return res.json({ ok: false, message: "Missing env vars" }, 500);
    }

    let body = {};
    try {
      body = req.body ? JSON.parse(req.body) : {};
    } catch {}

    const username = (body.username || "").trim();
    if (!username) {
      return res.json({ ok: false, message: "Missing username" }, 400);
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(client);

    const token = crypto.randomBytes(24).toString("hex"); // optional but useful
    const createdAt = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    // ✅ Create the document and capture the created doc (so we get $id)
    const created = await db.createDocument(databaseId, tableId, "unique()", {
      username,
      token,
      status: "PENDING",
      createdAt,
      expiresAt: expiresAtIso, // store ISO string
    });

    const requestId = created.$id;

    // Optional: build a link your frontend can use for QR
    // (Your frontend can also build this itself)
    const approvePath = `/approve?requestId=${requestId}`;

    return res.json({
      ok: true,
      username,
      requestId,
      token, // optional
      status: "PENDING",
      expiresAt: expiresAtIso,
      approvePath,
    });
  } catch (e) {
    error(e);
    return res.json({ ok: false, message: e.message }, 500);
  }
};