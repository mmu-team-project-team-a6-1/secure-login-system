const STEP_SECONDS = 1;

function base64UrlToBytes(b64url: string): Uint8Array {
	const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
	const pad = (4 - (b64.length % 4)) % 4;
	const bin = atob(b64 + "=".repeat(pad));
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function importKey(secretB64: string): Promise<CryptoKey> {
	const raw = base64UrlToBytes(secretB64);
	return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function generateToken(secretB64: string, epochSeconds: number): Promise<string> {
	const step = Math.floor(epochSeconds / STEP_SECONDS);
	const data = new TextEncoder().encode(String(step));
	const key = await importKey(secretB64);
	const sig = await crypto.subtle.sign("HMAC", key, data);
	return bytesToHex(new Uint8Array(sig)).slice(0, 16);
}

export async function verifyToken(
	secretB64: string,
	token: string,
	epochSeconds: number,
	windowSeconds = 2,
): Promise<boolean> {
	for (let offset = -windowSeconds; offset <= windowSeconds; offset++) {
		const candidate = await generateToken(secretB64, epochSeconds + offset);
		if (candidate === token) return true;
	}
	return false;
}

export function nowEpochSeconds(): number {
	return Math.floor(Date.now() / 1000);
}
