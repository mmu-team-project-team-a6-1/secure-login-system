import { Client, Databases } from "node-appwrite";
import { env } from "$env/dynamic/private";

const endpoint = env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const project = env.APPWRITE_PROJECT_ID ?? "";
const key = env.APPWRITE_API_KEY ?? "";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);

export const databases = new Databases(client);

export const dbId = env.APPWRITE_DATABASE_ID ?? "";
export const collections = {
	users: env.APPWRITE_COLLECTION_USERS ?? "",
	sessions: env.APPWRITE_COLLECTION_SESSIONS ?? "",
	loginActivity: env.APPWRITE_COLLECTION_LOGIN_ACTIVITY ?? "",
	qrSessions: env.APPWRITE_COLLECTION_QR_SESSIONS ?? "",
} as const;

export function isAppwriteConfigured(): boolean {
	return Boolean(project && key && dbId && collections.users && collections.sessions && collections.loginActivity && collections.qrSessions);
}
