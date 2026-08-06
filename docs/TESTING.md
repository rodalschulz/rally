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
npm run audit:elo # reconciliación Elo vs DB (requiere DATABASE_URL en web/.env)
```

## Qué se prueba hoy

| Módulo | Por qué |
|--------|---------|
| `lib/ranking/elo.ts` | Singles Elo por unit (K, orden cronológico, no doble conteo) |
| `lib/ranking/sessionResumen.ts` | Resumen de fecha por unit (Games/Sets): W–L + Elo.G / Elo.S inicio/fin; cutoff cronológico (sin filtrar fechas futuras) |
| `lib/ranking/playerStats.ts` | Ficha de jugador: career por unit Games|Sets (racha, asistencia, historial por Fecha) + Fecha-scoped Games (historial por Game, participación) + gráficos Elo multi-jugador (`buildSessionEloPaths`, `buildGroupEloPaths`) |
| `lib/ranking/simple.ts` | Puntos por unit (helper; sin ranking dobles en UI) |
| `lib/domain/gameScore.ts` | Marcador de set válido / empate / ≥6 |
| `lib/domain/split.ts` | Reparto, regalo de cancha, saldos netos |
| `lib/sessions/windows.ts` | Plazos de resultados y “fecha pasada” en hub |
| `lib/sessions/permissions.ts` | Borrar/editar/RSVP en fechas pasadas |
| `lib/sessions/goingPlayers.ts` | Orden de avatares going: creador + A–Z |
| `lib/debts/permissions.ts` | Saldar solo acreedor o admin + fecha pasada |
| `lib/debts/settleLabel.ts` | Copy del Historial: acreedor vs admin según `settledById` |
| `lib/debts/reconcile.ts` | Conservar settled válidas; limpiar huérfanas |
| `lib/matches/changelog.ts` | Textos del historial de resultados (anti-cheat) |
| `lib/matches/weightedPair.ts` | Pairing Aleatorio de Games: peso por menos partidos en la Fecha |
| `lib/avatar/optimize.ts` | Sticker ≤ 500 KB (resize + palette/WebP) |
| `lib/push/recipients.ts` | Excluir actor, filtro por preferencia, allow-list Fecha, cleanup 404/410 |
| `lib/push/leader.ts` | Detección de cambio de #1 Singles Games |
| `lib/push/fechaDiff.ts` | Qué cuenta como update material de Fecha |

## Manual QA (Web Push)

Requiere VAPID en env y build con service worker (`next start` o deploy; **no** `next dev`).

1. `/ajustes` → Activar notificaciones (Android Chrome o PWA iOS en Home Screen).
2. (Admin) **Enviar notificación de prueba** → llega push al propio dispositivo.
3. Desde otra cuenta del mismo grupo: crear Fecha → llega push; click abre la sesión.
4. Cambiar RSVP → push de asistencia (actor no recibe).
5. Agregar un Game o Set → push “Games y Sets” (editar/borrar no).
6. Apagar toggle “Nueva fecha” → crear otra Fecha → no llega.
7. Desactivar notificaciones → suscripción borrada; no llegan más.
8. (Opcional) Con ranking activo: game que cambie #1 → solo anterior y nuevo líder.

## Auditoría Elo vs DB

Script local `web/scripts/audit-elo.ts` (`npm run audit:elo`):

1. Lee matches/miembros reales por grupo.
2. Corre `buildEloRanking` (código de producto).
3. Recomputa Elo con una implementación independiente.
4. Verifica zero-sum, W/L, perfil de exclusiones y **encadenamiento** fecha→fecha (`eloEnd` de N = `eloStart` de N+1).

No va en CI por defecto (necesita Neon). Úsalo tras migrar datos o sospechar drift de ranking.

## Qué no (aún)

- Componentes / Playwright e2e
- Prisma / Neon / Auth.js (salvo el script `audit:elo` manual)
- Validación duplicada dentro de FormData en actions (se cubre vía parsers de dominio cuando existan)

## Cuándo agregar un test

1. Cambiás una regla en `DOMAIN.md` que ya tiene módulo puro → actualizá el test.
2. Aparece un bug de lógica → test de regresión mínimo antes o junto al fix.
3. Nueva fórmula (ELO, otro split) → tests primero en el módulo puro.

No agregues tests “por archivo nuevo” de UI.
