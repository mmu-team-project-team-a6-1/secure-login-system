// ============================================================================
// Appwrite Database Schema Reference
// ============================================================================
//
// Each exported type below maps 1:1 to an Appwrite collection.
// The mock data arrays show the shape of documents you'll store.
//
// Collection overview:
//   - users           → User accounts
//   - sessions        → Active login sessions (one per device)
//   - login_activity  → Audit log of every auth attempt
//   - qr_sessions     → Temporary QR-based login handshake records
// ============================================================================

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface User {
	id: string;
	username: string;
	displayName: string;
	email: string;
	createdAt: string; // ISO 8601
	avatarUrl: string | null;
}

export const mockUsers: User[] = [
	{
		id: "usr_01",
		username: "alex",
		displayName: "Alex",
		email: "alex@example.com",
		createdAt: "2025-11-01T09:30:00Z",
		avatarUrl: null,
	},
	{
		id: "usr_02",
		username: "jordan",
		displayName: "Jordan Rivera",
		email: "jordan@example.com",
		createdAt: "2025-12-15T14:20:00Z",
		avatarUrl: null,
	},
];

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface Session {
	id: string;
	userId: string;
	deviceInfo: string;
	ipAddress: string;
	createdAt: string;
	expiresAt: string;
	isActive: boolean;
}

export const mockSessions: Session[] = [
	{
		id: "ses_01",
		userId: "usr_01",
		deviceInfo: "Chrome 131 · macOS Sequoia",
		ipAddress: "82.132.214.97",
		createdAt: "2026-02-26T08:00:00Z",
		expiresAt: "2026-02-27T08:00:00Z",
		isActive: true,
	},
	{
		id: "ses_02",
		userId: "usr_01",
		deviceInfo: "Safari · iPhone 16 Pro",
		ipAddress: "82.132.214.97",
		createdAt: "2026-02-25T19:45:00Z",
		expiresAt: "2026-02-26T19:45:00Z",
		isActive: true,
	},
	{
		id: "ses_03",
		userId: "usr_02",
		deviceInfo: "Firefox 134 · Windows 11",
		ipAddress: "194.55.12.34",
		createdAt: "2026-02-24T11:10:00Z",
		expiresAt: "2026-02-25T11:10:00Z",
		isActive: false,
	},
];

// ---------------------------------------------------------------------------
// Login Activity (audit log)
// ---------------------------------------------------------------------------

export type AuthMethod = "passkey" | "qr" | "password";

export interface LoginActivity {
	id: string;
	userId: string;
	method: AuthMethod;
	timestamp: string;
	deviceInfo: string;
	success: boolean;
}

export const mockLoginActivity: LoginActivity[] = [
	{
		id: "log_01",
		userId: "usr_01",
		method: "passkey",
		timestamp: "2026-02-26T08:00:12Z",
		deviceInfo: "Chrome 131 · macOS Sequoia",
		success: true,
	},
	{
		id: "log_02",
		userId: "usr_01",
		method: "qr",
		timestamp: "2026-02-25T19:45:33Z",
		deviceInfo: "Safari · iPhone 16 Pro",
		success: true,
	},
	{
		id: "log_03",
		userId: "usr_02",
		method: "passkey",
		timestamp: "2026-02-24T11:10:05Z",
		deviceInfo: "Firefox 134 · Windows 11",
		success: true,
	},
	{
		id: "log_04",
		userId: "usr_01",
		method: "passkey",
		timestamp: "2026-02-24T07:22:41Z",
		deviceInfo: "Chrome 131 · macOS Sequoia",
		success: false,
	},
];

// ---------------------------------------------------------------------------
// QR Sessions (temporary handshake for cross-device login)
// ---------------------------------------------------------------------------

export type QRSessionStatus = "pending" | "authenticated" | "expired";

export interface QRSession {
	id: string;
	secret: string; // base64url-encoded HMAC secret
	status: QRSessionStatus;
	authorizedBy: string | null; // userId who scanned the code
	createdAt: string;
	expiresAt: string;
}

export const mockQRSessions: QRSession[] = [
	{
		id: "qr_01",
		secret: "dGhpcyBpcyBhIGRlbW8gc2VjcmV0",
		status: "authenticated",
		authorizedBy: "usr_01",
		createdAt: "2026-02-25T19:44:50Z",
		expiresAt: "2026-02-25T19:49:50Z",
	},
	{
		id: "qr_02",
		secret: "YW5vdGhlciBkZW1vIHNlY3JldA",
		status: "expired",
		authorizedBy: null,
		createdAt: "2026-02-24T10:00:00Z",
		expiresAt: "2026-02-24T10:05:00Z",
	},
];
