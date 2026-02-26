import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createQRSession } from "$lib/server/store";
import { getClientIp, lookupGeo } from "$lib/server/ip";

export const POST: RequestHandler = async ({ request }) => {
	const ip = getClientIp(request);
	const ua = request.headers.get("user-agent") ?? "Unknown";
	const geo = lookupGeo(ip);

	const qs = createQRSession(ip, ua, geo);
	return json({
		sessionId: qs.id,
		secret: qs.secret,
		createdAt: qs.createdAt,
	});
};
