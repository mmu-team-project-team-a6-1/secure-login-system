import { Client, Databases } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  try {
    // ✅ Match your Appwrite console env vars
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    const databaseId = process.env.DATABASE_ID; // you set this to: auth
    const tableId = process.env.TABLE_ID;       // you set this to: login_requests

    if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
      return res.json({ error: "Missing environment variables" }, 500);
    }

    // Accept requestId from query or JSON body
    const requestId =
      req.query?.requestId || (req.bodyJson?.requestId ?? null);

    if (!requestId) return res.json({ error: "requestId required" }, 400);

    // action defaults to getStatus
    const action =
      req.query?.action || (req.bodyJson?.action ?? "getStatus");

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // Fetch the login request doc by ID
    let doc;
    try {
      doc = await databases.getDocument(databaseId, tableId, requestId);
    } catch (err) {
      if (err?.code === 404) return res.json({ error: "login request not found" }, 404);
      throw err;
    }

    // Expiry handling
    const now = Date.now();
    const expiresAtMs =
      typeof doc.expiresAt === "number"
        ? doc.expiresAt
        : new Date(doc.expiresAt).getTime();

    if (doc.status === "PENDING" && now > expiresAtMs) {
      await databases.updateDocument(databaseId, tableId, requestId, {
        status: "EXPIRED",
      });
      return res.json({ status: "EXPIRED" });
    }

    // ✅ Action 1: getStatus
    if (action === "getStatus") {
      return res.json({ status: doc.status });
    }

    // ✅ Action 2: decision (approve/deny) — merged into this function
    if (action === "decision") {
      const decision = (req.bodyJson?.decision || req.query?.decision || "").toUpperCase();
      if (!["APPROVE", "DENY"].includes(decision)) {
        return res.json({ error: "decision must be APPROVE or DENY" }, 400);
      }

      // prevent changing after a decision
      if (doc.status !== "PENDING") {
        return res.json({ status: doc.status, message: "Already decided" });
      }

      const newStatus = decision === "APPROVE" ? "APPROVED" : "DENIED";

      await databases.updateDocument(databaseId, tableId, requestId, {
        status: newStatus,
        decidedAt: new Date().toISOString(),
      });

      return res.json({ status: newStatus });
    }

    return res.json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    log(err?.message || String(err));
    return res.json({ error: "server error" }, 500);
  }
};