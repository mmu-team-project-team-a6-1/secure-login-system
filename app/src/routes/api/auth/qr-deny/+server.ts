import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, denyQRSession } from "$lib/server/store";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Not authenticated" }, { status: 401 });
	}

	const { sessionId } = await request.json();

	if (!sessionId) {
		return json({ error: "Missing sessionId" }, { status: 400 });
	}

	const qs = await getQRSession(sessionId);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}
	if (qs.status !== "scanned") {
		return json({ error: "QR session is not awaiting approval" }, { status: 410 });
	}

	const denied = await denyQRSession(qs.id, locals.user.id);
	if (!denied) {
		return json({ error: "Denial failed" }, { status: 403 });
	}

	return json({ success: true });
};
