import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, approveQRSession, recordLogin } from "$lib/server/store";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Not authenticated" }, { status: 401 });
	}

	const { sessionId } = await request.json();

	if (!sessionId) {
		return json({ error: "Missing sessionId" }, { status: 400 });
	}

	const qs = getQRSession(sessionId);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}
	if (qs.status !== "scanned") {
		return json({ error: "QR session is not awaiting approval" }, { status: 410 });
	}

	const approved = approveQRSession(qs.id, locals.user.id);
	if (!approved) {
		return json({ error: "Approval failed" }, { status: 403 });
	}

	recordLogin(locals.user.id, "qr", qs.desktopUserAgent, true);

	return json({ success: true });
};
