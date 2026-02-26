import crypto from "node:crypto";
import { Query } from "node-appwrite";
import { databases, dbId, collections } from "$lib/server/appwrite";
import type {
	User,
	Session,
	QRSession,
	QRSessionGeo,
	LoginActivity,
	AuthMethod,
} from "$lib/data/example-data";

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

function docToUser(doc: Record<string, unknown>): User {
	return {
		id: doc.$id as string,
		username: doc.username as string,
		displayName: doc.displayName as string,
		email: doc.email as string,
		createdAt: doc.createdAt as string,
		avatarUrl: (doc.avatarUrl as string) ?? null,
		passkeyCredentialId: (doc.passkeyCredentialId as string) ?? null,
	};
}

function docToSession(doc: Record<string, unknown>): Session {
	return {
		id: doc.$id as string,
		userId: doc.userId as string,
		deviceInfo: doc.deviceInfo as string,
		ipAddress: doc.ipAddress as string,
		createdAt: doc.createdAt as string,
		expiresAt: doc.expiresAt as string,
		isActive: doc.isActive as boolean,
	};
}

function docToQRSession(doc: Record<string, unknown>): QRSession {
	let desktopGeo: QRSessionGeo | null = null;
	if (doc.desktopGeo != null && typeof doc.desktopGeo === "string") {
		try {
			desktopGeo = JSON.parse(doc.desktopGeo) as QRSessionGeo;
		} catch {
			// ignore
		}
	}
	return {
		id: doc.$id as string,
		secret: doc.secret as string,
		status: doc.status as QRSession["status"],
		authorizedBy: (doc.authorizedBy as string) ?? null,
		desktopIp: doc.desktopIp as string,
		desktopUserAgent: doc.desktopUserAgent as string,
		desktopGeo,
		createdAt: doc.createdAt as string,
		expiresAt: doc.expiresAt as string,
	};
}

function docToLoginActivity(doc: Record<string, unknown>): LoginActivity {
	return {
		id: doc.$id as string,
		userId: doc.userId as string,
		method: doc.method as AuthMethod,
		timestamp: doc.timestamp as string,
		deviceInfo: doc.deviceInfo as string,
		success: doc.success as boolean,
	};
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export async function createUser(username: string, credentialId: string): Promise<User> {
	const id = uid("usr");
	const now = isoNow();
	await databases.createDocument(dbId, collections.users, id, {
		username,
		displayName: username,
		email: `${username}@example.com`,
		createdAt: now,
		avatarUrl: null,
		passkeyCredentialId: credentialId,
	});
	return {
		id,
		username,
		displayName: username,
		email: `${username}@example.com`,
		createdAt: now,
		avatarUrl: null,
		passkeyCredentialId: credentialId,
	};
}

export async function getUserById(userId: string): Promise<User | undefined> {
	try {
		const doc = await databases.getDocument(dbId, collections.users, userId);
		return docToUser(doc as unknown as Record<string, unknown>);
	} catch {
		return undefined;
	}
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
	const { documents } = await databases.listDocuments(dbId, collections.users, [
		Query.equal("username", username),
		Query.limit(1),
	]);
	if (documents.length === 0) return undefined;
	return docToUser(documents[0] as unknown as Record<string, unknown>);
}

export async function findUserByCredentialId(credentialId: string): Promise<User | undefined> {
	const { documents } = await databases.listDocuments(dbId, collections.users, [
		Query.equal("passkeyCredentialId", credentialId),
		Query.limit(1),
	]);
	if (documents.length === 0) return undefined;
	return docToUser(documents[0] as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export async function createSession(userId: string, deviceInfo: string, ip: string): Promise<Session> {
	const id = uid("ses");
	const now = isoNow();
	const expiresAt = isoFuture(24);
	await databases.createDocument(dbId, collections.sessions, id, {
		userId,
		deviceInfo,
		ipAddress: ip,
		createdAt: now,
		expiresAt,
		isActive: true,
	});
	return { id, userId, deviceInfo, ipAddress: ip, createdAt: now, expiresAt, isActive: true };
}

export async function getSession(id: string): Promise<Session | undefined> {
	try {
		const doc = await databases.getDocument(dbId, collections.sessions, id);
		const s = docToSession(doc as unknown as Record<string, unknown>);
		if (new Date(s.expiresAt) < new Date()) {
			await databases.updateDocument(dbId, collections.sessions, id, { isActive: false });
			return undefined;
		}
		return s;
	} catch {
		return undefined;
	}
}

export async function setSessionInactive(id: string): Promise<void> {
	try {
		await databases.updateDocument(dbId, collections.sessions, id, { isActive: false });
	} catch {
		// ignore
	}
}

// ---------------------------------------------------------------------------
// QR session operations
// ---------------------------------------------------------------------------

const QR_TTL_MINUTES = 5;

export async function createQRSession(
	desktopIp: string,
	desktopUserAgent: string,
	desktopGeo: QRSessionGeo | null,
): Promise<QRSession> {
	const id = uid("qr");
	const secret = crypto.randomBytes(32).toString("base64url");
	const now = isoNow();
	const expiresAt = new Date(Date.now() + QR_TTL_MINUTES * 60_000).toISOString();
	await databases.createDocument(dbId, collections.qrSessions, id, {
		secret,
		status: "pending",
		authorizedBy: null,
		desktopIp,
		desktopUserAgent,
		desktopGeo: desktopGeo ? JSON.stringify(desktopGeo) : null,
		createdAt: now,
		expiresAt,
	});
	return {
		id,
		secret,
		status: "pending",
		authorizedBy: null,
		desktopIp,
		desktopUserAgent,
		desktopGeo,
		createdAt: now,
		expiresAt,
	};
}

export async function getQRSession(id: string): Promise<QRSession | undefined> {
	try {
		const doc = await databases.getDocument(dbId, collections.qrSessions, id);
		const qs = docToQRSession(doc as unknown as Record<string, unknown>);
		if ((qs.status === "pending" || qs.status === "scanned") && new Date(qs.expiresAt) < new Date()) {
			await databases.updateDocument(dbId, collections.qrSessions, id, { status: "expired" });
			qs.status = "expired";
		}
		return qs;
	} catch {
		return undefined;
	}
}

export async function scanQRSession(id: string, userId: string): Promise<boolean> {
	const qs = await getQRSession(id);
	if (!qs || qs.status !== "pending") return false;
	await databases.updateDocument(dbId, collections.qrSessions, id, {
		status: "scanned",
		authorizedBy: userId,
	});
	return true;
}

export async function approveQRSession(id: string, userId: string): Promise<boolean> {
	const qs = await getQRSession(id);
	if (!qs || qs.status !== "scanned" || qs.authorizedBy !== userId) return false;
	await databases.updateDocument(dbId, collections.qrSessions, id, { status: "authenticated" });
	return true;
}

export async function denyQRSession(id: string, userId: string): Promise<boolean> {
	const qs = await getQRSession(id);
	if (!qs || qs.status !== "scanned" || qs.authorizedBy !== userId) return false;
	await databases.updateDocument(dbId, collections.qrSessions, id, { status: "denied" });
	return true;
}

// ---------------------------------------------------------------------------
// Login activity
// ---------------------------------------------------------------------------

export async function recordLogin(
	userId: string,
	method: AuthMethod,
	device: string,
	success: boolean,
): Promise<LoginActivity> {
	const id = uid("log");
	const timestamp = isoNow();
	await databases.createDocument(dbId, collections.loginActivity, id, {
		userId,
		method,
		timestamp,
		deviceInfo: device,
		success,
	});
	return { id, userId, method, timestamp, deviceInfo: device, success };
}

export async function getLoginActivityForUser(userId: string): Promise<LoginActivity[]> {
	const { documents } = await databases.listDocuments(dbId, collections.loginActivity, [
		Query.equal("userId", userId),
		Query.orderDesc("timestamp"),
		Query.limit(20),
	]);
	return documents.map((d) => docToLoginActivity(d as unknown as Record<string, unknown>));
}

export async function getSessionsForUser(userId: string): Promise<Session[]> {
	const { documents } = await databases.listDocuments(dbId, collections.sessions, [
		Query.equal("userId", userId),
		Query.equal("isActive", true),
	]);
	const now = new Date();
	return documents
		.map((d) => docToSession(d as unknown as Record<string, unknown>))
		.filter((s) => new Date(s.expiresAt) >= now);
}
