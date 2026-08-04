# Setup: Google Auth + Neon (rally)

## 1. Neon

1. Create a project at [https://console.neon.tech](https://console.neon.tech)
2. Open **Connection details**
3. Copy the **pooled** connection string → `DATABASE_URL` (host contains `-pooler`)
4. Copy the **direct** connection string → `DIRECT_URL` (no `-pooler`)

## 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → create/select a project
2. **OAuth consent screen** → External (or Internal if Workspace) → add your email as test user while in Testing
3. **Credentials** → Create credentials → OAuth client ID → **Web application**
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR_VERCEL_DOMAIN/api/auth/callback/google` (después del deploy)
5. Copy Client ID → `AUTH_GOOGLE_ID`
6. Copy Client secret → `AUTH_GOOGLE_SECRET`

## 3. Local env

```bash
cd web
cp .env.example .env
# edit .env with the values above
# generate AUTH_SECRET (and optionally CRON_SECRET for the Miraflores bot):
openssl rand -base64 32
```

## 4. Database migrate

Prisma 6: `DATABASE_URL` (pooler) + `DIRECT_URL` (direct) van en `prisma/schema.prisma`.

```bash
cd web
npx prisma migrate dev --name init
```

## 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → login with Google → create a fecha.

## Vercel

Add these env vars in the Vercel project settings:

- `DATABASE_URL`, `DIRECT_URL`
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `CRON_SECRET` — same value as `bot` `RALLY_CRON_SECRET` (availability sync)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — Web Push (see below)

`AUTH_URL` is usually inferred; if login redirects break, set it to your production URL.

## Web Push (optional)

Push notifications need VAPID keys. Generate once and reuse across environments:

```bash
cd web
npx web-push generate-vapid-keys
```

Put the output into `.env` / Vercel as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT` to a contact URI — prefer `mailto:you@example.com` (a bare email also works; the app prefixes `mailto:`).

Opt-in UI: **Ajustes → Notificaciones**. Push only works where a service worker is registered (production / `next start`, not `next dev`). On iOS, the user must **Add to Home Screen** first.

Build command should run `prisma generate` (or `prisma migrate deploy` on release). Scripts in `package.json` include `postinstall`: `prisma generate`.

Bot sync from your PC: see [`../../bot/docs/PC_SYNC.md`](../../bot/docs/PC_SYNC.md).
