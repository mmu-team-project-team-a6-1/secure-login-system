import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, users, createSession } from "$lib/server/store";

export const GET: RequestHandler = async ({ params, cookies }) => {
	const qs = getQRSession(params.id);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}

	if (qs.status === "authenticated" && qs.authorizedBy) {
		const user = users.get(qs.authorizedBy);
		if (user) {
			const session = createSession(user.id, "QR Login", "127.0.0.1");
			cookies.set("session", session.id, {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				secure: false,
				maxAge: 60 * 60 * 24,
			});
		}
	}

	return json({ status: qs.status });
};
