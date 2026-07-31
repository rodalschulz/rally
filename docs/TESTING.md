# Testing

## Filosofía (MVP)

No buscamos cobertura total. Probamos **módulos puros de dominio** donde un bug es silencioso y caro (plata, ranking, plazos). No priorizamos unit tests de React, Auth.js ni Server Actions en esta etapa.

Si una regla vive en UI o en una action, primero **extraerla** a `web/src/lib/...` y luego testearla.

## Runner

- **Vitest** en `web/`
- Archivos: `web/src/**/*.test.ts` (junto al módulo)
- Config: `web/vitest.config.ts` (alias `@/` → `src/`)

```bash
cd web
npm test          # una corrida (CI / pre-push mental)
npm run test:watch
```

## Qué se prueba hoy

| Módulo | Por qué |
|--------|---------|
| `lib/ranking/elo.ts` | Singles Elo por unit (K, orden cronológico, no doble conteo) |
| `lib/ranking/simple.ts` | Dobles / puntos por unit; no doble conteo |
| `lib/domain/gameScore.ts` | Marcador de set válido / empate / ≥6 |
| `lib/domain/split.ts` | Reparto, regalo de cancha, saldos netos |
| `lib/sessions/windows.ts` | Plazos de chat, resultados y “fecha pasada” en hub |
| `lib/sessions/chat.ts` | Quién puede postear + límites de cuerpo |
| `lib/sessions/permissions.ts` | Borrar/editar/RSVP en fechas pasadas |
| `lib/sessions/goingPlayers.ts` | Orden de avatares going: creador + A–Z |
| `lib/debts/permissions.ts` | Saldar solo acreedor + fecha pasada |
| `lib/debts/reconcile.ts` | Conservar settled válidas; limpiar huérfanas |

## Qué no (aún)

- Componentes / Playwright e2e
- Prisma / Neon / Auth.js
- Validación duplicada dentro de FormData en actions (se cubre vía parsers de dominio cuando existan)

## Cuándo agregar un test

1. Cambiás una regla en `DOMAIN.md` que ya tiene módulo puro → actualizá el test.
2. Aparece un bug de lógica → test de regresión mínimo antes o junto al fix.
3. Nueva fórmula (ELO, otro split) → tests primero en el módulo puro.

No agregues tests “por archivo nuevo” de UI.
