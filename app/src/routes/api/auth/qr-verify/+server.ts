import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getQRSession, scanQRSession } from "$lib/server/store";
import { verifyToken } from "$lib/utils/totp";
import { verifyQrJwt } from "$lib/server/qr-jwt";

/** User-friendly country display (geoip returns ISO codes). */
const COUNTRY_DISPLAY: Record<string, string> = {
	GB: "UK",
	US: "USA",
};

/** Optional region display names (geoip may return codes like ENG). */
const REGION_DISPLAY: Record<string, string> = {
	ENG: "England",
	SCT: "Scotland",
	NIR: "Northern Ireland",
	WLS: "Wales",
};

function formatLocation(geo: { city?: string | null; region?: string | null; country?: string | null }): string | null {
	const city = geo.city?.trim() || null;
	const region = (geo.region?.trim() && (REGION_DISPLAY[geo.region] ?? geo.region)) || null;
	const country = (geo.country?.trim() && (COUNTRY_DISPLAY[geo.country] ?? geo.country)) || null;

	// Prefer: "City, Region" then "City, Country" then "Region" then "Country"
	if (city && region) return `${city}, ${region}`;
	if (city && country) return `${city}, ${country}`;
	if (region) return region;
	if (country) return country;
	return null;
}

function parseUserAgent(ua: string): string {
	let browser = "Unknown browser";
	let os = "Unknown OS";

	if (/Edg\//i.test(ua)) browser = "Edge";
	else if (/Chrome\//i.test(ua)) browser = "Chrome";
	else if (/Firefox\//i.test(ua)) browser = "Firefox";
	else if (/Safari\//i.test(ua)) browser = "Safari";

	if (/Windows/i.test(ua)) os = "Windows";
	else if (/Mac OS X|macOS/i.test(ua)) os = "macOS";
	else if (/Linux/i.test(ua)) os = "Linux";
	else if (/CrOS/i.test(ua)) os = "ChromeOS";

	return `${browser} on ${os}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Not authenticated" }, { status: 401 });
	}

	let body: { jwt?: string; sessionId?: string; token?: string; timestamp?: number };
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	let sessionId: string;

	if (body.jwt && typeof body.jwt === "string") {
		// JWT path: verify with fixed HS256 only (never use payload to decide algorithm)
		const payload = await verifyQrJwt(body.jwt);
		if (!payload) {
			return json({ error: "Invalid or expired QR code" }, { status: 403 });
		}
		sessionId = payload.sessionId;
	} else {
		const { sessionId: sid, token, timestamp } = body;
		if (!sid || !token || !timestamp) {
			return json({ error: "Missing fields" }, { status: 400 });
		}
		sessionId = sid;

		const qs = getQRSession(sessionId);
		if (!qs) {
			return json({ error: "QR session not found" }, { status: 404 });
		}
		if (qs.status !== "pending") {
			return json({ error: "QR session already used or expired" }, { status: 410 });
		}

		const serverNow = Math.floor(Date.now() / 1000);
		if (Math.abs(serverNow - timestamp) > 5) {
			return json({ error: "Timestamp too far from server time" }, { status: 400 });
		}

		const valid = await verifyToken(qs.secret, token, serverNow, 2);
		if (!valid) {
			return json({ error: "Invalid token" }, { status: 403 });
		}
	}

	const qs = getQRSession(sessionId);
	if (!qs) {
		return json({ error: "QR session not found" }, { status: 404 });
	}
	if (qs.status !== "pending") {
		return json({ error: "QR session already used or expired" }, { status: 410 });
	}

	scanQRSession(qs.id, locals.user.id);

	const geo = qs.desktopGeo;
	const location = geo ? formatLocation(geo) : null;

	return json({
		success: true,
		sessionId: qs.id,
		desktop: {
			device: parseUserAgent(qs.desktopUserAgent),
			ip: qs.desktopIp,
			location,
			geo,
		},
	});
};
