import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { findUserByCredentialId, createSession, recordLogin } from "$lib/server/store";

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { credentialId } = await request.json();

	if (!credentialId || typeof credentialId !== "string") {
		return json({ error: "Passkey credential is required" }, { status: 400 });
	}

	const user = findUserByCredentialId(credentialId);
	if (!user) {
		return json({ error: "No account found for this passkey" }, { status: 404 });
	}

	const ua = request.headers.get("user-agent") ?? "Unknown";
	const session = createSession(user.id, ua, "127.0.0.1");
	recordLogin(user.id, "passkey", ua, true);

	cookies.set("session", session.id, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: false,
		maxAge: 60 * 60 * 24,
	});

	return json({ user });
};
