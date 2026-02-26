import type { Handle } from "@sveltejs/kit";
import { getSession, users } from "$lib/server/store";

export const handle: Handle = async ({ event, resolve }) => {
	const sid = event.cookies.get("session");
	if (sid) {
		const session = getSession(sid);
		if (session) {
			event.locals.user = users.get(session.userId) ?? null;
			event.locals.sessionId = session.id;
		} else {
			event.locals.user = null;
			event.locals.sessionId = null;
			event.cookies.delete("session", { path: "/" });
		}
	} else {
		event.locals.user = null;
		event.locals.sessionId = null;
	}
	return resolve(event);
};
