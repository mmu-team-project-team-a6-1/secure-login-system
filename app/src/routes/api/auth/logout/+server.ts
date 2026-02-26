import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { sessions } from "$lib/server/store";

export const POST: RequestHandler = async ({ cookies }) => {
	const sid = cookies.get("session");
	if (sid) {
		const session = sessions.get(sid);
		if (session) session.isActive = false;
		cookies.delete("session", { path: "/" });
	}
	return json({ ok: true });
};
