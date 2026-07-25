# web — rally

App Next.js (App Router) + TypeScript + Tailwind para coordinar tenis del grupo.

## Setup (Auth + Neon)

Ver paso a paso: **[docs/SETUP.md](docs/SETUP.md)**  
(Google OAuth + Neon `DATABASE_URL` / `DIRECT_URL` + `AUTH_SECRET`)

```bash
cd web
cp .env.example .env   # completar valores
npm install
npx prisma migrate dev --name init
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → Continuar con Google.

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo |
| `npm run build` | `prisma generate` + build |
| `npm run db:migrate` | Migraciones |
| `npm run db:studio` | Prisma Studio |
| `node scripts/generate-icons.mjs` | Regenerar iconos PWA |

## Diseño

Marca **rally**: dark mode, UI minimal, acento lima, bottom nav, PWA.
