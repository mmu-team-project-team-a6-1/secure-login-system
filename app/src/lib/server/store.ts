import crypto from "node:crypto";
import type { User, Session, QRSession, LoginActivity, AuthMethod } from "$lib/data/example-data";

// ---------------------------------------------------------------------------
// In-memory stores – will be replaced by Appwrite collections
// ---------------------------------------------------------------------------

export const users = new Map<string, User>();
export const sessions = new Map<string, Session>();
export const qrSessions = new Map<string, QRSession>();
export const loginActivity: LoginActivity[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function isoNow(): string {
	return new Date().toISOString();
}

function isoFuture(hours: number): string {
	return new Date(Date.now() + hours * 3_600_000).toISOString();
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export function createUser(username: string, credentialId: string): User {
	const user: User = {
		id: uid("usr"),
		username,
		displayName: username,
		email: `${username}@example.com`,
		createdAt: isoNow(),
		avatarUrl: null,
		passkeyCredentialId: credentialId,
	};
	users.set(user.id, user);
	return user;
}

export function findUserByUsername(username: string): User | undefined {
	return [...users.values()].find((u) => u.username === username);
}

export function findUserByCredentialId(credentialId: string): User | undefined {
	return [...users.values()].find((u) => u.passkeyCredentialId === credentialId);
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export function createSession(userId: string, deviceInfo: string, ip: string): Session {
	const session: Session = {
		id: uid("ses"),
		userId,
		deviceInfo,
		ipAddress: ip,
		createdAt: isoNow(),
		expiresAt: isoFuture(24),
		isActive: true,
	};
	sessions.set(session.id, session);
	return session;
}

export function getSession(id: string): Session | undefined {
	const s = sessions.get(id);
	if (!s) return undefined;
	if (new Date(s.expiresAt) < new Date()) {
		s.isActive = false;
		return undefined;
	}
	return s;
}

// ---------------------------------------------------------------------------
// QR session operations
// ---------------------------------------------------------------------------

const QR_TTL_MINUTES = 5;

export function createQRSession(): QRSession {
	const secret = crypto.randomBytes(32).toString("base64url");
	const qs: QRSession = {
		id: uid("qr"),
		secret,
		status: "pending",
		authorizedBy: null,
		createdAt: isoNow(),
		expiresAt: new Date(Date.now() + QR_TTL_MINUTES * 60_000).toISOString(),
	};
	qrSessions.set(qs.id, qs);
	return qs;
}

export function getQRSession(id: string): QRSession | undefined {
	const qs = qrSessions.get(id);
	if (!qs) return undefined;
	if (qs.status === "pending" && new Date(qs.expiresAt) < new Date()) {
		qs.status = "expired";
	}
	return qs;
}

export function authenticateQRSession(id: string, userId: string): boolean {
	const qs = getQRSession(id);
	if (!qs || qs.status !== "pending") return false;
	qs.status = "authenticated";
	qs.authorizedBy = userId;
	return true;
}

// ---------------------------------------------------------------------------
// Login activity
// ---------------------------------------------------------------------------

export function recordLogin(
	userId: string,
	method: AuthMethod,
	device: string,
	success: boolean,
): LoginActivity {
	const entry: LoginActivity = {
		id: uid("log"),
		userId,
		method,
		timestamp: isoNow(),
		deviceInfo: device,
		success,
	};
	loginActivity.push(entry);
	return entry;
}

export function getLoginActivityForUser(userId: string): LoginActivity[] {
	return loginActivity.filter((l) => l.userId === userId).slice(-20);
}

export function getSessionsForUser(userId: string): Session[] {
	return [...sessions.values()].filter((s) => s.userId === userId && s.isActive);
}
