import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession } from "$lib/server/store";
import { verifyToken } from "$lib/utils/totp";
import { signQrJwt } from "$lib/server/qr-jwt";

export const POST: RequestHandler = async ({ request }) => {
	let body: { sessionId?: string; token?: string; timestamp?: number };
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { sessionId, token, timestamp } = body;
	if (!sessionId || !token || typeof timestamp !== "number") {
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

	const valid = await verifyToken(qs.secret, token, timestamp, 2);
	if (!valid) {
		return json({ error: "Invalid token" }, { status: 403 });
	}

	const jwt = await signQrJwt(sessionId, timestamp);
	return json({ jwt });
};
