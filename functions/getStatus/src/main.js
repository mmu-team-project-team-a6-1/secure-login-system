import { Client, Databases } from "node-appwrite";

export default async ({ req, res, log }) => {
  try {
    const requestId = req.query?.requestId || (req.bodyJson?.requestId ?? null);

    if (!requestId) return res.json({ error: "requestId required" }, 400);

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    let doc;
    try {
      doc = await databases.getDocument(
        process.env.DB_ID,
        process.env.COLLECTION_ID,
        requestId
      );
    } catch (err) {
      if (err?.code === 404) {
        return res.json({ error: "login request not found" }, 404);
      }
      throw err;
    }

    const now = Date.now();
    if (doc.status === "PENDING" && now > doc.expiresAt) {
      await databases.updateDocument(
        process.env.DB_ID,
        process.env.COLLECTION_ID,
        requestId,
        { status: "EXPIRED" }
      );
      return res.json({ status: "EXPIRED" });
    }

    return res.json({ status: doc.status });
  } catch (err) {
    log(err?.message || String(err));
    return res.json({ error: "server error" }, 500);
  }
};