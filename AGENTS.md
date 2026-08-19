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
- [`docs/TESTING.md`](docs/TESTING.md) — qué testear en MVP

## Reglas de trabajo

1. **Respetar el lenguaje de dominio** de `docs/DOMAIN.md` (`Group`, `Session` / `PlaySession`, `Attendance`, `financier`, `Debt`, `Match` con `unit` game|set, rankings Games/Sets).
2. **No mezclar** credenciales ni lógica del bot Miraflores dentro del bundle cliente de `web/`.
3. **No commitear** `.env` (ni el de `bot/`). Usar `.env.example`. No commitear `bot/sync.log`.
4. **MVP primero:** grupos + asistencia + financiador + split de deudas + resultados + rankings. Sin pagos online reales.
5. **Ranking = Elo singles** (Games \| Sets). Sin ranking de dobles en UI. Sets no expanden a Games en ranking.
6. Preferir lógica de negocio en módulos puros (`lib/domain`, `lib/ranking`, `lib/sessions`, `lib/debts`, `lib/groups`, `lib/admin`) testeables, no solo en componentes React. Ver [`docs/TESTING.md`](docs/TESTING.md).
7. Si una decisión de producto no está en `docs/`, preguntar o documentarla en `docs/` antes de inventar comportamiento silencioso.
8. Coordinación es **por grupo** (membresía). Root = discovery de grupos públicos + mis grupos. Canchas libres son **globales**.
9. **Admin de app** (`User.isAdmin`) ≠ owner de grupo. Privilegios: editar/borrar fechas, cambiar RSVP de miembros en fechas **aún abiertas**, y saldar deudas pasadas. Fechas Pasadas: asistencia inmutable (también para admin). No implica gestionar ajustes del grupo.

## Dónde tocar código

| Objetivo | Ubicación |
|----------|-----------|
| Disponibilidad Miraflores | `bot/` |
| UI / API app social | `web/` |
| Sync bot → Neon | `bot/open_chrome.py` + `web/src/app/api/availability/sync/` |
| Grupos / join / membresía | `web/src/lib/groups/`, `web/src/lib/actions/groups.ts` |
| Cambiar reglas de negocio | actualizar `docs/DOMAIN.md` + código en `web/src/lib/...` (+ test si hay módulo puro) |
| Cambiar arquitectura / stack | actualizar `docs/ARCHITECTURE.md` |
| Tests de dominio | `web/src/lib/**/*.test.ts` + `docs/TESTING.md` |

## Estado actual (snapshot)

- `bot/` operativo como script local (`open_chrome.py`); sync opcional a rally con `RALLY_CRON_SECRET`.
- `web/`: Next.js + **Auth.js (Google)** + **Neon/Prisma**, marca **rally**, dark mode, PWA + **Web Push** (`/ajustes` opt-in + preferencias; `lib/push`).
- Pantallas: `/` (discovery; si el usuario ya tiene grupos, redirige a las Fechas de su primer grupo — `?discover=1` fuerza ver discovery, y es a donde apunta la pestaña "Grupos"), `/grupos/nuevo`, `/join/[code]`, `/grupos/[slug]` (Fechas; canchas/integrantes en modal), `.../sessions/*` (ficha stats Games de la Fecha desde Resumen), `.../rankings/*` (ficha stats Games|Sets career al tocar jugador), `.../deudas`, `/ajustes` (perfil + sticker avatar + notificaciones), `/login`.
- Header (`AppShell`): botón de info ("Cómo funciona") con panel de instrucciones por pestañas para usuarios (`HelpButton`).
- Setup: `web/docs/SETUP.md` (incluye VAPID). Ranking = Elo singles por unit Games/Sets (`web/src/lib/ranking/elo.ts`); resumen de fecha (`sessionResumen.ts`); ficha de jugador Games|Sets desde Ranking (`playerStats.ts`). Sin ranking de dobles en UI. Tests: `cd web && npm test`. Auditoría Elo vs DB: `cd web && npm run audit:elo`.
- Resultados: Games con ganador obligatorio + Servidor opcional; Sets pueden quedar En curso; soft-delete + historial en modal; Resumen Games (Elo.G) + Resumen Sets si hubo sets (Elo.S); UX optimista. Sin chat de fecha. Deudas: Te deben/Debes agrupadas, sheet Pagar (Yape/Plin + WhatsApp), “Ya pagué” + push, Historial de saldadas (últimas 5; Ver todo el historial carga el resto). Al entrar: modal si hay deudas `open` de Fechas con más de 7 días (Lima). Perfil: celular de cobro en `/ajustes`.
- Hub Fechas: Próximas todas; Fechas Pasadas las 5 más recientes, **Ver todas** hace fetch del resto. Ficha de jugador: toca Rival más jugado → panel Vs cada jugador.
- Push: opt-in en `/ajustes`; prefs Fecha / RSVP / Game|Set agregado / ranking #1 / deudas (saldar + “ya pagué”); `web/src/lib/push/` + `/api/push/*`.
- Modelo tenis `PlaySession` (no confundir con Auth `Session`). Scoped por `groupId`.
- Documentación: `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`.

## Convenciones UI (`web/`)

- Mobile-first, bottom nav **dentro del grupo**, dark by default, `viewport-fit=cover` + safe areas.
- Español (es-PE, tú), soles (`PEN`).
- Tipografía de sistema — UI minimal.
- Lógica de negocio en `src/lib/domain`, `src/lib/ranking`, `src/lib/matches`, `src/lib/debts`, `src/lib/groups`, `src/lib/push`.
- Usuario actual = `auth()` de Auth.js. Nunca hardcodear player ids.
- Acciones de coordinación: validar membresía + `groupId`.
