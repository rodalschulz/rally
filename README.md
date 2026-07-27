# Tenis — coordinación de partidos + bot de canchas

Monorepo para organizar partidos de tenis entre amigos (asistencias, quién paga la cancha, deudas, resultados y rankings) y, por separado, un bot que consulta horarios disponibles en la municipalidad de Miraflores.

Marca de la app: **rally**.

## Estructura

```
tenis/
├── bot/          # Script Selenium: disponibilidad de canchas Miraflores
├── web/          # App Next.js (rally): coordinación del grupo
├── docs/         # Visión, dominio y arquitectura
├── AGENTS.md     # Contexto para agentes / colaboradores
└── README.md
```

## Qué hace cada parte

| Carpeta | Rol |
|---------|-----|
| `bot/` | Automatiza login + scrape/API de disponibilidad de canchas. Puede sincronizar a rally (`POST /api/availability/sync`). |
| `web/` | App social del grupo: sesiones, RSVP, financiador, saldos, matches, rankings, canchas libres. |
| `docs/` | Fuente de verdad de producto y diseño técnico. |

## Empezar

- **App (rally):** ver [`web/README.md`](web/README.md) y [`web/docs/SETUP.md`](web/docs/SETUP.md)
- **Bot:** ver [`bot/README.md`](bot/README.md)
- **Sync PC → Neon:** ver [`bot/docs/PC_SYNC.md`](bot/docs/PC_SYNC.md)

```bash
cd web
cp .env.example .env   # completar (Neon, Google, AUTH_SECRET, CRON_SECRET)
npm install
npx prisma migrate dev
npm run dev
```

## Deploy (Vercel)

Este repo es un **monorepo**. En Vercel:

1. Importá `rodalschulz/rally`
2. **Root Directory:** `web`
3. Env vars: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET` — detalle en [`web/docs/SETUP.md`](web/docs/SETUP.md)

No subas solo `/web` al repo: conviene mantener `bot/` y `docs/` juntos.

## Documentación

1. [Visión del producto](docs/VISION.md) — qué construimos y por qué  
2. [Modelo de dominio](docs/DOMAIN.md) — sesiones, RSVP, financiador, deudas, Games/Sets  
3. [Arquitectura](docs/ARCHITECTURE.md) — stack, datos, despliegue  
4. [Testing](docs/TESTING.md) — Vitest en módulos puros (qué sí / qué no)  
5. [AGENTS.md](AGENTS.md) — reglas y contexto para agentes de código  
