import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { findUserByUsername, createSession, recordLogin } from "$lib/server/store";

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { username } = await request.json();

	if (!username || typeof username !== "string") {
		return json({ error: "Username is required" }, { status: 400 });
	}

	const user = findUserByUsername(username.trim().toLowerCase());
	if (!user) {
		return json({ error: "User not found" }, { status: 404 });
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
