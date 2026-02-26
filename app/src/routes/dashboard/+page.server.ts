import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSessionsForUser, getLoginActivityForUser } from "$lib/server/store";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, "/");
	}

	return {
		user: locals.user,
		sessions: getSessionsForUser(locals.user.id),
		activity: getLoginActivityForUser(locals.user.id),
	};
};
