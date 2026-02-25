import { Client, Databases } from "node-appwrite";
import crypto from "crypto";

export default async ({ req, res, error }) => {
  try {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.DATABASE_ID;
    const tableId = process.env.TABLE_ID;

    if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
      return res.json({ ok: false, message: "Missing env vars" }, 500);
    }

    // ✅ Accept body from either req.bodyJson (preferred) or req.body (string)
    let body = req.bodyJson ?? {};
    if (!body || typeof body !== "object") body = {};

    if (!req.bodyJson && req.body) {
      try {
        body = JSON.parse(req.body);
      } catch {
        // ignore
      }
    }

    const username = String(body.username || "").trim();
    if (!username) {
      return res.json({ ok: false, message: "Missing username" }, 400);
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(client);

    const token = crypto.randomBytes(24).toString("hex"); // 48 chars
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    const created = await db.createDocument(databaseId, tableId, "unique()", {
      username,
      token,
      status: "PENDING",
      createdAt,
      expiresAt, // ✅ matches your column name
    });

    const requestId = created.$id;

    return res.json({
      ok: true,
      username,
      requestId,
      token,
      status: "PENDING",
      expiresAt,
      approvePath: `/approve?requestId=${requestId}`,
    });
  } catch (e) {
    error(e);
    return res.json({ ok: false, message: e?.message || "server error" }, 500);
  }
};