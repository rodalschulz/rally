# AGENTS.md — contexto para agentes y colaboradores

## Qué es este repo

Monorepo **tenis**:

1. **`bot/`** — Script Python/Selenium que consulta disponibilidad de canchas en la app municipal de Miraflores.  
2. **`web/`** — (Por crear) App Next.js + TypeScript + Tailwind para que un grupo de amigos coordine partidos: asistencias, quién pagó la cancha, deudas, scores y rankings.  
3. **`docs/`** — Fuente de verdad de producto y arquitectura.

Leer antes de implementar features de producto:

- [`docs/VISION.md`](docs/VISION.md)
- [`docs/DOMAIN.md`](docs/DOMAIN.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Reglas de trabajo

1. **Respetar el lenguaje de dominio** de `docs/DOMAIN.md` (`Session`, `Attendance`, `financier`, `Debt`, `Match`, rankings singles/dobles).
2. **No mezclar** credenciales ni lógica del bot Miraflores dentro del bundle cliente de `web/`.
3. **No commitear** `.env` (ni el de `bot/`). Usar `.env.example`.
4. **MVP primero:** asistencia + financiador + split de deudas + matches + rankings. Sin pagos online reales.
5. **Singles ranking > doubles** en prioridad de UX y de implementación.
6. Preferir lógica de negocio en módulos puros (`lib/domain`, `lib/ranking`) testeables, no solo en componentes React.
7. Si una decisión de producto no está en `docs/`, preguntar o documentarla en `docs/` antes de inventar comportamiento silencioso.
8. La app es de **grupo cerrado** (amigos), no un marketplace público de canchas.

## Dónde tocar código

| Objetivo | Ubicación |
|----------|-----------|
| Disponibilidad Miraflores | `bot/` |
| UI / API app social | `web/` (cuando exista) |
| Cambiar reglas de negocio | actualizar `docs/DOMAIN.md` + código en `web/src/lib/...` |
| Cambiar arquitectura / stack | actualizar `docs/ARCHITECTURE.md` |

## Estado actual (snapshot)

- `bot/` operativo como script local (`open_chrome.py`).
- `web/`: Next.js + **Auth.js (Google)** + **Neon/Prisma**, marca **rally**, dark mode, PWA.
- Pantallas: `/login`, `/`, `/sessions/nueva`, `/sessions/[id]`, rankings, `/deudas`.
- Setup: `web/docs/SETUP.md`. Ranking MVP = 3 pts por victoria.
- Modelo tenis `PlaySession` (no confundir con Auth `Session`).

## Convenciones UI (`web/`)

- Mobile-first, bottom nav, dark by default, `viewport-fit=cover` + safe areas.
- Español (es-PE), soles (`PEN`).
- Tipografía de sistema — UI minimal.
- Lógica de negocio en `src/lib/domain`, `src/lib/ranking`, `src/lib/debts`.
- Usuario actual = `auth()` de Auth.js. Nunca hardcodear player ids.
