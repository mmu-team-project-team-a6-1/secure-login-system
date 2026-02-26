import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, getUserById, createSession } from "$lib/server/store";

export const GET: RequestHandler = async ({ params, cookies }) => {
	const qs = await getQRSession(params.id);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}

	if (qs.status === "authenticated" && qs.authorizedBy) {
		const user = await getUserById(qs.authorizedBy);
		if (user) {
			const session = await createSession(user.id, qs.desktopUserAgent, qs.desktopIp);
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
