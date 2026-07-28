# Arquitectura

## Vista general

```
tenis/                          # monorepo
├── bot/                        # Python + Selenium (tooling local / Task Scheduler)
│   ├── open_chrome.py
│   ├── requirements.txt
│   ├── run_sync.bat
│   ├── .env                    # credenciales Miraflores + RALLY_* (no commitear)
│   └── output/                 # HTML generado
├── web/                        # Next.js app (Vercel) — marca rally
│   ├── prisma/                 # schema + migraciones
│   └── src/                    # App Router + TS + Tailwind
└── docs/                       # producto + arquitectura
```

Dos sistemas, un repo:

| Sistema | Runtime | Deploy |
|---------|---------|--------|
| `bot/` | Python local (Task Scheduler en Windows) | No en Vercel |
| `web/` | Node / Next.js | Vercel |

Integración bot↔web: el bot corre en **PC**, hace `POST /api/availability/sync` con `CRON_SECRET`, y el hub del grupo lee `AvailabilitySnapshot` en Neon. Ver `bot/docs/PC_SYNC.md`.

## App web (`web/`)

### Stack (actual)

- **Next.js** (App Router) + **TypeScript** + **Tailwind**
- **Auth:** Auth.js + Google OAuth (JWT session; adapter Prisma)
- **DB:** Prisma 6 + Neon Postgres (`DATABASE_URL` pooler + `DIRECT_URL` para migrate)
- **Mutaciones:** Server Actions + Route Handler de sync (`/api/availability/sync`)
- **Hosting:** Vercel (Root Directory = `web`)
- **PWA:** manifest + service worker básicos

### Modelo multi-grupo

```
Login Google → / (discovery)
  ├── grupos públicos + Unirme
  ├── Mis grupos
  ├── /grupos/nuevo
  └── /join/[code] (+ password si private)
       ↓
/grupos/[slug]  (hub: Fechas + canchas libres globales)
  ├── sessions/nueva | sessions/[id]
  ├── rankings/singles | doubles
  └── deudas
```

AuthZ: middleware exige login (salvo `/login`, assets, API auth/sync). Dentro del grupo: `requireGroupMember(slug)` + actions validan membresía y que `playSession.groupId` coincida.

### ¿Hace falta un backend aparte?

**No para el MVP.** Next.js en Vercel cubre UI, auth, grupos, CRUD de sesiones / RSVP / deudas / matches y rankings.

Considerar un worker aparte solo si aparecen:

- Scraping sin depender de una PC encendida
- Notificaciones WhatsApp/email a escala
- Lógica que exceda timeouts de serverless

### Módulos lógicos (dentro de `web/`)

```
src/
  app/
    page.tsx                 # Discovery (públicos + mis grupos)
    login/
    grupos/nuevo/
    grupos/[slug]/           # Hub Fechas + canchas libres
      sessions/nueva| [id]/
      rankings/singles|doubles/
      deudas/
    join/[code]/
    api/auth/[...nextauth]/
    api/availability/sync/   # bot → Neon (Bearer CRON_SECRET)
  components/
  lib/
    groups/                  # create, join, requireMember, crypto
    domain/                  # tipos + split de costo
    ranking/                 # buildRanking por format + unit (game 1pt / set 3pt)
    sessions/                # ventanas chat/resultados, permisos, chat helpers
    debts/                   # sync de deudas open
    actions/                 # Server Actions (groups + sessions)
    data/                    # queries scoped por groupId
  auth.ts / auth.config.ts
```

Tests de dominio: Vitest (`npm test` en `web/`). Ver [`TESTING.md`](TESTING.md).

### Páginas (MVP UI)

1. Root discovery: marca, mis grupos, públicos, crear  
2. Crear grupo / join por invite  
3. Hub del grupo: sesiones + canchas libres  
4. Detalle de sesión: RSVP, financiador, deudas, resultados (Games/Sets), chat  
5. Ranking singles (Games \| Sets) / dobles Sets (por grupo)  
6. Ajustes de grupo / cuenta (salir, borrar grupo, borrar cuenta)  
7. Deudas del grupo  
8. Login Google  

### Datos y consistencia

- Al cambiar `costAmount`, `financierId` o set de `going`, **recalcular deudas** de esa sesión (reemplazar deudas `open` derivadas; no tocar `settled` sin regla explícita).
- Rankings: on-read vía `buildRanking` filtrando matches del grupo por `format` + `unit`.
- Contraseñas de grupo: solo `passwordHash` (bcrypt); nunca al cliente.

### Seguridad

- Rutas de producto detrás de auth (middleware Auth.js).
- Membresía de grupo en server components / actions.
- Nunca exponer `bot/.env` ni credenciales Miraflores al cliente web.
- Sync de disponibilidad solo con `Authorization: Bearer <CRON_SECRET>`.
- No commitear `.env`; usar `.env.example`.

## Bot (`bot/`)

- Selenium → login SSO Miraflores → captura respuesta de disponibilidad.
- Filtra canchas relevantes (IDs 30–41 en el código actual).
- Salida: consola + `bot/output/tenis_availability.html`.
- Opcional: POST a rally con `RALLY_API_URL` + `RALLY_CRON_SECRET`.

Tratarlo como **adaptador**, no como núcleo de la app social.

## Decisiones

| Tema | Estado |
|------|--------|
| Proveedor de auth | **Auth.js + Google** |
| Proveedor de DB | **Neon Postgres** + Prisma 6 |
| Multi-grupo | Root = discovery; coordinación bajo `/grupos/[slug]` |
| Grupos privados | Invite + contraseña; no listados en root |
| Canchas libres | Globales (sin groupId) |
| Algoritmo de ranking | MVP: Games 1 pt / Sets 3 pts; sin doble conteo; ELO abierto |
| Tests | Vitest en módulos puros (`docs/TESTING.md`) |
| Nombre de marca UI | **rally** |
| Setup local | `web/docs/SETUP.md` |
| Puente bot ↔ web | PC + `CRON_SECRET` (`bot/docs/PC_SYNC.md`) |
| ¿Financiador cuenta en el split si no asiste? | Propuesta en DOMAIN.md; confirmar con el grupo |
| Monorepo tool (pnpm / Turborepo) | No necesario por ahora |
| Roles granulares / kick / billing | Fuera de alcance MVP multi-grupo |
| Fecha pasada | Solo lectura para miembros; admin de app puede editar/borrar; owner puede borrar |
| Admin de app (`User.isAdmin`) | Editar/borrar cualquier fecha; cambiar RSVP de miembros; saldar deudas pasadas (como miembro) |

## Orden de implementación (histórico / pendientes)

Hecho: scaffold web, DB + auth, sesiones + RSVP + financiador + deudas, matches, rankings, puente bot, **multi-grupo** (discovery + hub).

Pendiente / nice-to-have: rotar invite/password UI completa, ELO, bot sin PC, notificaciones.
