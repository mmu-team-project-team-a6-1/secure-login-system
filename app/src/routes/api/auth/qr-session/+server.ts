import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createQRSession } from "$lib/server/store";

export const POST: RequestHandler = async () => {
	const qs = createQRSession();
	return json({
		sessionId: qs.id,
		secret: qs.secret,
		createdAt: qs.createdAt,
	});
};
