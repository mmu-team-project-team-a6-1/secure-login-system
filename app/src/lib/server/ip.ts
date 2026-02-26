import geoip from "geoip-lite";

export interface GeoData {
	city: string | null;
	country: string | null;
	region: string | null;
	ll: [number, number] | null;
}

export function getClientIp(request: Request): string {
	const headers: [string, (v: string) => string][] = [
		["x-vercel-forwarded-for", (v) => v.split(",")[0].trim()],
		["cf-connecting-ip", (v) => v.trim()],
		["x-real-ip", (v) => v.trim()],
		["x-forwarded-for", (v) => v.split(",")[0].trim()],
	];

	for (const [name, extract] of headers) {
		const value = request.headers.get(name);
		if (value) {
			const ip = extract(value);
			if (ip) return ip;
		}
	}

	return "Unknown";
}

export function lookupGeo(ip: string): GeoData | null {
	if (!ip || ip === "Unknown" || ip === "127.0.0.1" || ip === "::1") return null;

	const result = geoip.lookup(ip);
	if (!result) return null;

	return {
		city: result.city || null,
		country: result.country || null,
		region: result.region || null,
		ll: result.ll ?? null,
	};
}
