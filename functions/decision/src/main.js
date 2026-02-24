import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log }) => {
  try {
    const body = req.bodyJson ?? {};
    const token = body.token;
    const decision = body.decision; // APPROVED or DENIED

    if (!token || typeof token !== "string") {
      return res.json({ error: "token is required" }, 400);
    }
    if (!["APPROVED", "DENIED"].includes(decision)) {
      return res.json({ error: "decision must be APPROVED or DENIED" }, 400);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const results = await databases.listDocuments(
      process.env.DB_ID,
      process.env.COLLECTION_ID,
      [Query.equal("token", token)]
    );

    if (results.total === 0) return res.json({ error: "invalid token" }, 404);

    const doc = results.documents[0];

    if (doc.status !== "PENDING") {
      return res.json({ message: `Already ${doc.status}` });
    }

    if (Date.now() > doc.expiresAt) {
      await databases.updateDocument(
        process.env.DB_ID,
        process.env.COLLECTION_ID,
        doc.$id,
        { status: "EXPIRED" }
      );
      return res.json({ message: "Session expired" });
    }

    await databases.updateDocument(
      process.env.DB_ID,
      process.env.COLLECTION_ID,
      doc.$id,
      {
        status: decision,
        approvedAt: decision === "APPROVED" ? Date.now() : null,
        deviceInfo: req.headers?.["user-agent"] || "unknown"
      }
    );

    return res.json({ message: `Login ${decision.toLowerCase()}` });
  } catch (err) {
    log(err?.message || String(err));
    return res.json({ error: "server error" }, 500);
  }
};