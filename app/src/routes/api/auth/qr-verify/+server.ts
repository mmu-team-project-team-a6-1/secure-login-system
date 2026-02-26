import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, authenticateQRSession, recordLogin } from "$lib/server/store";
import { verifyToken } from "$lib/utils/totp";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Not authenticated" }, { status: 401 });
	}

	const { sessionId, token, timestamp } = await request.json();

	if (!sessionId || !token || !timestamp) {
		return json({ error: "Missing fields" }, { status: 400 });
	}

	const qs = getQRSession(sessionId);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}
	if (qs.status !== "pending") {
		return json({ error: "QR session already used or expired" }, { status: 410 });
	}

	const serverNow = Math.floor(Date.now() / 1000);
	if (Math.abs(serverNow - timestamp) > 5) {
		return json({ error: "Timestamp too far from server time" }, { status: 400 });
	}

	const valid = await verifyToken(qs.secret, token, serverNow, 2);
	if (!valid) {
		return json({ error: "Invalid token" }, { status: 403 });
	}

	authenticateQRSession(qs.id, locals.user.id);
	recordLogin(locals.user.id, "qr", "QR Scanner", true);

	return json({ success: true });
};
