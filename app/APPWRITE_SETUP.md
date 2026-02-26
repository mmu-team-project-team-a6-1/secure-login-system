# Appwrite setup (server-only)

This app uses **Appwrite Databases** on the server only. We do **not** use Appwrite Auth or any client-side Appwrite SDK. Session and user data live in our own collections.

## 1. Appwrite project

1. Create an account at [cloud.appwrite.io](https://cloud.appwrite.io) (or use self-hosted).
2. Create a project and note:
   - **Project ID** (Settings → General).
   - **API key**: Project Settings → API Keys → Create API Key. Give it a name and **Databases** permissions (read + write). Copy the secret; it’s shown only once.

## 2. Database and collections

In the Appwrite Console → **Databases**:

1. Create a database (e.g. `secure-login-db`). Copy its **Database ID**.
2. Create **four collections** with these IDs (or match the IDs you put in `.env`):

### Collection: `users`  
Use collection ID: `users` (or set `APPWRITE_COLLECTION_USERS` to your ID.)

| Attribute ID        | Type    | Size / options | Required |
|---------------------|--------|------------------|----------|
| username            | string | 255               | yes      |
| displayName         | string | 255               | yes      |
| email               | string | 255               | yes      |
| createdAt           | string | 255               | yes      |
| avatarUrl           | string | 2048              | no       |
| passkeyCredentialId | string | 512               | no       |

### Collection: `sessions`  
Use collection ID: `sessions` (or set `APPWRITE_COLLECTION_SESSIONS`.)

| Attribute ID | Type    | Size / options | Required |
|--------------|--------|------------------|----------|
| userId       | string | 36                | yes      |
| deviceInfo   | string | 512               | yes      |
| ipAddress    | string | 45                 | yes      |
| createdAt    | string | 255               | yes      |
| expiresAt    | string | 255               | yes      |
| isActive     | boolean| —                 | yes      |

### Collection: `login_activity`  
Use collection ID: `login_activity` (or set `APPWRITE_COLLECTION_LOGIN_ACTIVITY`.)

| Attribute ID | Type   | Size / options | Required |
|--------------|--------|-----------------|----------|
| userId       | string | 36               | yes      |
| method       | string | 32               | yes      |
| timestamp    | string | 255              | yes      |
| deviceInfo   | string | 512              | yes      |
| success      | boolean| —                | yes      |

### Collection: `qr_sessions`  
Use collection ID: `qr_sessions` (or set `APPWRITE_COLLECTION_QR_SESSIONS`.)

| Attribute ID    | Type   | Size / options | Required |
|-----------------|--------|-----------------|----------|
| secret         | string | 512             | yes      |
| status         | string | 32              | yes      |
| authorizedBy   | string | 36              | no       |
| desktopIp      | string | 45              | yes      |
| desktopUserAgent| string | 1024            | yes      |
| desktopGeo     | string | 2048            | no       |
| createdAt      | string | 255             | yes      |
| expiresAt      | string | 255             | yes      |

- **Document security**: set collection permissions so that **only server (API key)** can read/write (e.g. no “Any” or “Users” read/write). The app uses the API key on the server; no client access is needed.

## 3. Environment variables

Copy `app/.env.example` to `app/.env` and set:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key_secret

APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_USERS=users
APPWRITE_COLLECTION_SESSIONS=sessions
APPWRITE_COLLECTION_LOGIN_ACTIVITY=login_activity
APPWRITE_COLLECTION_QR_SESSIONS=qr_sessions
```

- `.env` is already in `.gitignore`; do not commit it.
- For local dev, `QR_JWT_SECRET` can be any long random string if you use QR login.

## 4. Run the app

From the `app` directory:

```bash
pnpm dev
```

If any of the env vars or collection IDs are wrong, you’ll get Appwrite errors when logging in, signing up, or using QR login. Double-check project ID, API key, database ID, and the four collection IDs and attribute names above.
