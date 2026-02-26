import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createUser, findUserByUsername, createSession, recordLogin } from "$lib/server/store";
import { getClientIp } from "$lib/server/ip";

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { username, credentialId } = await request.json();

	if (!username || typeof username !== "string" || username.trim().length < 2) {
		return json({ error: "Username must be at least 2 characters" }, { status: 400 });
	}

	if (!credentialId || typeof credentialId !== "string") {
		return json({ error: "Passkey credential is required" }, { status: 400 });
	}

	const clean = username.trim().toLowerCase();

	if (await findUserByUsername(clean)) {
		return json({ error: "Username already taken" }, { status: 409 });
	}

	const user = await createUser(clean, credentialId);
	const ua = request.headers.get("user-agent") ?? "Unknown";
	const ip = getClientIp(request);
	const session = await createSession(user.id, ua, ip);
	await recordLogin(user.id, "passkey", ua, true);

	cookies.set("session", session.id, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: false,
		maxAge: 60 * 60 * 24,
	});

	return json({ user });
};
