import { SignJWT, jwtVerify } from "jose";
import { env } from "$env/dynamic/private";

const QR_JWT_ISSUED_VALIDITY_SECONDS = 5;

function getSecret(): Uint8Array {
	const raw = env.QR_JWT_SECRET ?? "dev-qr-jwt-secret-do-not-use-in-production";
	return new TextEncoder().encode(raw);
}

export interface QrJwtPayload {
	sessionId: string;
	iat: number;
	exp: number;
}

/**
 * Sign a QR login JWT with HS256 only. Verification must use algorithms: ['HS256']
 * so the server never accepts alg:none or algorithm confusion.
 */
export async function signQrJwt(sessionId: string, iat: number): Promise<string> {
	const exp = iat + QR_JWT_ISSUED_VALIDITY_SECONDS;
	const secret = getSecret();
	return new SignJWT({ sessionId })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt(iat)
		.setExpirationTime(iat + QR_JWT_ISSUED_VALIDITY_SECONDS)
		.sign(secret);
}

/**
 * Verify QR login JWT. Uses fixed algorithms: ['HS256'] so the server never
 * honours alg from the token or accepts a different algorithm (tamper-proof).
 */
export async function verifyQrJwt(jwt: string): Promise<QrJwtPayload | null> {
	try {
		const secret = getSecret();
		const { payload } = await jwtVerify(jwt, secret, {
			algorithms: ["HS256"],
		});
		const sessionId = payload.sessionId as string | undefined;
		const iat = payload.iat as number | undefined;
		const exp = payload.exp as number | undefined;
		if (!sessionId || typeof iat !== "number" || typeof exp !== "number") return null;
		if (exp < Math.floor(Date.now() / 1000)) return null;
		return { sessionId, iat, exp };
	} catch {
		return null;
	}
}
