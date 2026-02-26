import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSession, setSessionInactive } from "$lib/server/store";

export const POST: RequestHandler = async ({ cookies }) => {
	const sid = cookies.get("session");
	if (sid) {
		const session = await getSession(sid);
		if (session) await setSessionInactive(sid);
		cookies.delete("session", { path: "/" });
	}
	return json({ ok: true });
};
