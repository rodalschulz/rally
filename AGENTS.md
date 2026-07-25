# AGENTS.md — contexto para agentes y colaboradores

## Qué es este repo

Monorepo **tenis**:

1. **`bot/`** — Script Python/Selenium que consulta disponibilidad de canchas en la app municipal de Miraflores y puede publicar snapshots a rally.
2. **`web/`** — App Next.js + TypeScript + Tailwind (**rally**) para que amigos coordinen tenis **por grupo**: fechas, quién pagó, deudas, scores y rankings.
3. **`docs/`** — Fuente de verdad de producto y arquitectura.

Leer antes de implementar features de producto:

- [`docs/VISION.md`](docs/VISION.md)
- [`docs/DOMAIN.md`](docs/DOMAIN.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Reglas de trabajo

1. **Respetar el lenguaje de dominio** de `docs/DOMAIN.md` (`Group`, `Session` / `PlaySession`, `Attendance`, `financier`, `Debt`, `Match`, rankings singles/dobles).
2. **No mezclar** credenciales ni lógica del bot Miraflores dentro del bundle cliente de `web/`.
3. **No commitear** `.env` (ni el de `bot/`). Usar `.env.example`.
4. **MVP primero:** grupos + asistencia + financiador + split de deudas + matches + rankings. Sin pagos online reales.
5. **Singles ranking > doubles** en prioridad de UX y de implementación.
6. Preferir lógica de negocio en módulos puros (`lib/domain`, `lib/ranking`, `lib/debts`, `lib/groups`) testeables, no solo en componentes React.
7. Si una decisión de producto no está en `docs/`, preguntar o documentarla en `docs/` antes de inventar comportamiento silencioso.
8. Coordinación es **por grupo** (membresía). Root = discovery de grupos públicos + mis grupos. Canchas libres son **globales**.

## Dónde tocar código

| Objetivo | Ubicación |
|----------|-----------|
| Disponibilidad Miraflores | `bot/` |
| UI / API app social | `web/` |
| Sync bot → Neon | `bot/open_chrome.py` + `web/src/app/api/availability/sync/` |
| Grupos / join / membresía | `web/src/lib/groups/`, `web/src/lib/actions/groups.ts` |
| Cambiar reglas de negocio | actualizar `docs/DOMAIN.md` + código en `web/src/lib/...` |
| Cambiar arquitectura / stack | actualizar `docs/ARCHITECTURE.md` |

## Estado actual (snapshot)

- `bot/` operativo como script local (`open_chrome.py`); sync opcional a rally con `RALLY_CRON_SECRET`.
- `web/`: Next.js + **Auth.js (Google)** + **Neon/Prisma**, marca **rally**, dark mode, PWA.
- Pantallas: `/` (discovery), `/grupos/nuevo`, `/join/[code]`, `/grupos/[slug]` (Fechas + canchas), `.../sessions/*`, `.../rankings/*`, `.../deudas`, `/login`.
- Setup: `web/docs/SETUP.md`. Ranking MVP = 3 pts por victoria (`web/src/lib/ranking/simple.ts`).
- Modelo tenis `PlaySession` (no confundir con Auth `Session`). Scoped por `groupId`.

## Convenciones UI (`web/`)

- Mobile-first, bottom nav **dentro del grupo**, dark by default, `viewport-fit=cover` + safe areas.
- Español (es-PE, tú), soles (`PEN`).
- Tipografía de sistema — UI minimal.
- Lógica de negocio en `src/lib/domain`, `src/lib/ranking`, `src/lib/debts`, `src/lib/groups`.
- Usuario actual = `auth()` de Auth.js. Nunca hardcodear player ids.
- Acciones de coordinación: validar membresía + `groupId`.
