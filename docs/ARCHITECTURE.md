# Arquitectura

## Vista general

```
tenis/                          # monorepo
├── bot/                        # Python + Selenium (tooling local)
│   ├── open_chrome.py
│   ├── requirements.txt
│   ├── .env                    # credenciales Miraflores (no commitear)
│   └── output/                 # HTML generado
├── web/                        # Next.js app (Vercel)
│   └── (App Router + TS + Tailwind)
└── docs/                       # producto + arquitectura
```

Dos sistemas, un repo:

| Sistema | Runtime | Deploy |
|---------|---------|--------|
| `bot/` | Python local (o cron futuro) | No en Vercel |
| `web/` | Node / Next.js | Vercel |

Integración bot↔web (opción A): el bot corre en **PC**, hace `POST /api/availability/sync` con `CRON_SECRET`, y Fechas lee `AvailabilitySnapshot` en Neon. Ver `bot/docs/PC_SYNC.md`.

## App web (`web/`)

### Stack propuesto

- **Next.js** (App Router) + **TypeScript** + **Tailwind**
- **Auth:** por definir (Clerk / Auth.js / magic link). Grupo cerrado → invites o allowlist.
- **DB:** empezar con algo serverless-friendly:
  - **Opción A (recomendada MVP):** [Prisma](https://www.prisma.io/) + [Neon](https://neon.tech/) / Supabase Postgres / Turso  
  - **Opción B:** Supabase (Auth + Postgres + RLS) si se quiere menos glue code  
- **Mutaciones:** Server Actions o Route Handlers; sin API externa obligatoria al inicio.
- **Hosting:** Vercel (frontend + server components + actions en la misma app).

### ¿Hace falta un backend aparte?

**No para el MVP.** Next.js en Vercel cubre:

- UI
- Auth callbacks
- CRUD de sesiones / RSVP / deudas / matches
- Cálculo de rankings en servidor

Considerar un backend/worker aparte solo si aparecen:

- Scraping programado del bot (mejor un cron + Python o un job queue)
- Notificaciones WhatsApp/email a escala
- Lógica que exceda timeouts de serverless

### Módulos lógicos (dentro de `web/`)

```
src/
  app/                 # rutas UI
    sessions/          # listado + detalle + RSVP
    rankings/
      singles/
      doubles/
    debts/             # saldos / historial (opcional en MVP)
  components/
  lib/
    domain/            # tipos + reglas (split de costo, etc.)
    ranking/           # algoritmos singles/dobles
    db/                # cliente Prisma/Drizzle
  actions/             # Server Actions
```

### Páginas mínimas (MVP UI)

1. Lista de sesiones futuras (+ pasadas)
2. Detalle de sesión: asistentes, financiador, costo, deudas de esa fecha, matches
3. Ranking singles
4. Ranking dobles
5. (Nice) vista “quién me debe / a quién debo”

### Datos y consistencia

- Al cambiar `costAmount`, `financierId` o set de `going`, **recalcular deudas** de esa sesión (reemplazar deudas `open` derivadas de la sesión; no tocar `settled` sin regla explícita).
- Rankings: recalcular on-read o materializar en tabla `RankingSnapshot` si el cómputo se vuelve pesado.

### Seguridad

- Todo dato del grupo detrás de auth.
- Nunca exponer `bot/.env` ni credenciales Miraflores al cliente web.
- Validar en servidor que solo miembros del grupo mutan sesiones.

## Bot (`bot/`)

- Selenium headless → login SSO Miraflores → captura respuesta de disponibilidad.
- Filtra canchas relevantes (IDs 30–41 en el código actual).
- Salida: consola + `bot/output/tenis_availability.html`.

Futuro posible: job que escribe slots libres a DB o notifica Discord/WhatsApp. Tratarlo como **adaptador**, no como núcleo de la app social.

## Decisiones abiertas (registrar aquí cuando se cierren)

| Tema | Estado |
|------|--------|
| Proveedor de auth | **Auth.js + Google** (registro abierto con el link) |
| Proveedor de DB | **Neon Postgres** + Prisma 6 (`DATABASE_URL` + `DIRECT_URL`) |
| Algoritmo de ranking | MVP: 3 pts/win (`web/src/lib/ranking/simple.ts`); ELO abierto |
| Nombre de marca UI | **rally** |
| Setup local | `web/docs/SETUP.md` |
| ¿Financiador cuenta en el split si no asiste? | Propuesta en DOMAIN.md; confirmar con el grupo |
| Monorepo tool (pnpm workspaces / Turborepo) | No necesario hasta que `web/` exista |

## Orden de implementación sugerido

1. Scaffold `web/` (Next + TS + Tailwind)  
2. Modelo DB + auth mínima  
3. CRUD sesiones + RSVP + financiador + split de deudas  
4. Carga de matches  
5. Rankings singles → luego dobles  
6. (Opcional) puente con `bot/`  
