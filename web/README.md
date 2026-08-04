# web — rally

App Next.js (App Router) + TypeScript + Tailwind para coordinar tenis del grupo.

## Setup (Auth + Neon)

Ver paso a paso: **[docs/SETUP.md](docs/SETUP.md)**  
(Google OAuth + Neon `DATABASE_URL` / `DIRECT_URL` + `AUTH_SECRET` + `CRON_SECRET` para el bot)

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
| `npm test` | Unit tests (Vitest, dominio) |
| `npm run test:watch` | Vitest en watch |
| `npm run db:migrate` | Migraciones |
| `npm run db:studio` | Prisma Studio |
| `node scripts/generate-icons.mjs` | Regenerar iconos PWA |

Tests: solo módulos puros por ahora — ver [`../docs/TESTING.md`](../docs/TESTING.md).

## Rutas principales

| Ruta | Uso |
|------|-----|
| `/login` | Google Auth |
| `/` | Discovery: mis grupos + públicos + crear |
| `/grupos/nuevo` | Crear grupo |
| `/join/[code]` | Unirse por invite (+ password si privado) |
| `/grupos/[slug]` | Hub Fechas + canchas libres (global) |
| `/grupos/[slug]/sessions/*` | Crear / detalle, RSVP, resultados, chat |
| `/grupos/[slug]/rankings/singles` | Ranking Games \| Sets |
| `/grupos/[slug]/deudas` | Saldos del grupo |
| `/grupos/[slug]/ajustes` | Salir / editar / borrar grupo |
| `/ajustes` | Cuenta (borrar cuenta) |

## Diseño

Marca **rally**: dark mode, UI minimal, acento lima, bottom nav, PWA.

## Bot / disponibilidad

Para publicar canchas libres desde la PC: [`../bot/docs/PC_SYNC.md`](../bot/docs/PC_SYNC.md).
