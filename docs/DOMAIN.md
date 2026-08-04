# Modelo de dominio

Lenguaje compartido para producto y código. Preferir estos nombres en UI, DB y PRs.

## Contenedor: Group (grupo)

Unidad de coordinación. Fechas, deudas y rankings viven **dentro** de un grupo. Las canchas libres (Miraflores) son **globales** de la app, no por grupo.

| Campo | Notas |
|-------|--------|
| `name` / `slug` | `slug` único en URL (`/grupos/[slug]`) |
| `description` | Opcional; máx. 250 chars; dueño edita en ajustes; se muestra bajo el nombre en el hub |
| `visibility` | `public` \| `private` |
| `passwordHash` | bcrypt; obligatorio si `private` |
| `inviteCode` | Token opaco único → `/join/[code]` |
| `maxMembers` | Cupo; join falla si ya hay tantos miembros |
| `createdById` | Creador |

Owner edita nombre, `maxMembers` y (si es privado) contraseña de join en `/grupos/[slug]/ajustes` (slug no cambia). El creador de una fecha puede editarla en `.../sessions/[id]/editar`.

**Fechas pasadas (hub):** cuando cierra la ventana de resultados (`startsAt + 2 h`), la fecha es de solo lectura: nadie cambia asistencia, edita ni carga resultados. **Borrar** solo el **owner del grupo** o un **admin de app**. Mientras no sea pasada: editar = creador; borrar = creador o financiador. Borrar cascada (asistencias, deudas, matches) → esos resultados dejan de contar en el ranking.

**Discovery:** el root lista solo grupos `public`. Los privados no aparecen; se entra solo por invite/link (+ contraseña).

**Membresía (`GroupMember`):** `role` = `owner` \| `member`. Owner = creador. Cualquier miembro puede coordinar fechas; solo owner edita ajustes / invite (MVP: create + copy invite).

**Salir del grupo** (`/grupos/[slug]/ajustes`): cualquier miembro puede abandonar. Si es el único miembro, el grupo se elimina (cascada de fechas/deudas/matches). Si es dueño y hay más integrantes, el dueño pasa al miembro con `joinedAt` más antiguo.

**Eliminar grupo** (`/grupos/[slug]/ajustes`, solo owner): borra el grupo entero y cascada (fechas, deudas, matches, membresías), aunque haya más integrantes.

**Borrar cuenta** (`/ajustes`): el usuario sale de todos los grupos (mismas reglas) y se elimina el `User` (Auth accounts/sessions, asistencias; deudas que lo involucran; scrub de ids en matches).

**Jugadores del grupo** = miembros (`GroupMember` → `User`), no todos los users globales.

## Entidades

### Player (jugador / miembro)

Persona del grupo. En código: modelo Prisma `User` (Auth.js). Identidad: Google OAuth + `displayName` / `shortName` (derivados del perfil). Scoped al grupo vía `GroupMember`.

**Admin de app (`User.isAdmin`):** flag global, independiente del owner de un grupo. Privilegios (siempre como miembro del grupo):

- Editar cualquier fecha (también pasadas), sin ser el creador  
- Borrar cualquier fecha (próxima o pasada)  
- Cambiar la asistencia (Voy / Quizás / No voy / Pendiente) de cualquier miembro en una fecha (también pasadas; recalcula deudas)  
- Saldar cualquier deuda abierta de una fecha ya pasada  

No sustituye al `GroupMember.role = owner` para ajustes del grupo (nombre, invite, borrar grupo).

### Session (sesión / fecha de cancha)

En producto: **sesión** o **fecha**. En DB: **`PlaySession`** (evita choque con Auth.js `Session`).

| Campo | Notas |
|-------|--------|
| `groupId` | Grupo dueño (requerido) |
| `startsAt` | Instant UTC; en UI siempre como hora de pared en `America/Lima` (24h) |
| `courtLabel` | Opcional (ej. cancha 30–41 según API Miraflores) |
| `costAmount` | Costo total en soles (ej. 22.50) |
| `currency` | Default `PEN` |
| `financierCoversAll` | Si true, el financiador regala la cancha → no se generan deudas |
| `financierId` | Quién pagó la cancha (**financiador**) |
| `createdById` | Quién creó el registro |
| `status` | `scheduled` \| `completed` \| `cancelled` |
| `note` | Opcional |
| `maxAttendees` | Opcional; cupo de `going` |
| `allowedUserIds` | Vacío = todos; si hay ids, solo ellos pueden marcar Voy |

**Financiador:** “quien adelantó el pago de la cancha”. En UI: “Pagó la cancha” / “Financiador”.

**Regalo de cancha:** `financierCoversAll = true` → no se generan deudas (el financiador cubre todo).

**Hora de creación:** el input de fecha usa pared `America/Lima` (24h); al guardar, los minutos se fijan a `:00` (slots horarios).

### Ventanas temporales de una fecha

Duración de cancha asumida: **1 h** desde `startsAt`. Implementación: `web/src/lib/sessions/windows.ts`.

| Ventana | Abierta mientras | Uso |
|---------|------------------|-----|
| Resultados (Games/Sets) | `now < startsAt + 1 h + 60 min` | Agregar/editar/borrar resultados (solo `going`) |
| Hub “Fechas Pasadas” | cuando cierra la ventana de resultados | Deja de listarse en Próximas; fecha solo lectura (salvo editar/borrar por admin de app; borrar también por owner) |

**Ranking:** cuentan matches de fechas con `startsAt < now` (no espera a que cierre la ventana de resultados). Ver `listRankingMatches`.

### Attendance (asistencia / RSVP)

Relación Player ↔ Session (`userId` + `playSessionId`):

| Campo | Notas |
|-------|--------|
| `status` | `going` \| `not_going` \| `maybe` \| `pending` |
| `updatedAt` | |

Regla MVP: entran al **reparto de costo** solo los `going`.

**Orden de avatares en el listado de Fechas (hub):** solo `going`. Primero el **creador de la fecha** (`createdById`) si está en Voy; el resto A–Z por `displayName` (`es`). No usa owner del grupo ni financiador.

**Admin en UI:** la lista de jugadores muestra el mismo badge que un miembro normal; al tocar el estado se abre un select (Pendiente / Voy / Quizás / No voy) y un confirm antes de guardar.

**Default (simple):**

- El costo se divide en partes iguales entre jugadores con `going`.
- El financiador suele estar entre los `going`.
- Si el financiador no asiste pero pagó, los `going` le deben `costo / N` cada uno (N = número de `going`); el financiador no “consume” una parte porque no juega — recibe el 100% del costo repartido entre quienes sí van.  
  *(Confirmar con el grupo si preferís incluir siempre al financiador en N aunque no juegue.)*

### Debt (deuda)

Obligación de pago entre dos jugadores, normalmente derivada de una sesión:

| Campo | Notas |
|-------|--------|
| `fromUserId` | Quien debe |
| `toUserId` | Quien recibe (casi siempre el financiador) |
| `playSessionId` | Origen — cada deuda es de **una** fecha (nunca se fusionan entre fechas) |
| `amount` | |
| `status` | `open` \| `settled` |
| `settledAt` | Cuándo se marcó saldada |
| `settledById` | Quién la saldó (acreedor o admin de app). Null en filas legacy |

Scoped al grupo al filtrar deudas por `playSession.groupId`. En UI (`/deudas`), cada fila abierta muestra la fecha de origen (chip + hora + cancha) con link al detalle. La sección **Historial** lista las deudas `settled` (más reciente primero): quién saldó (acreedor vs admin) + `settledAt`.

**Saldar:** el acreedor (`toUserId`) o un **admin de app**, y solo cuando la fecha ya es pasada (misma regla que el hub). El deudor no puede saldar. Al saldar se guardan `settledAt` y `settledById` (el actor). En Historial: “Saldó el acreedor (Nombre)” o “Saldó un admin (Nombre)” según `settledById === toUserId` o no. Filas sin `settledById` (antes del campo) solo muestran la fecha.

**Sync al cambiar Voy / costo / financiador** (`syncOpenDebtsForSession`): recalcula deudas `open`; conserva `settled` que sigan coincidiendo (mismos from/to/monto); **borra** `settled` huérfanas (p. ej. el deudor pasó a “No voy”). Módulo: `web/src/lib/debts/reconcile.ts`.

Fórmula base (financiador asiste, N asistentes `going`):

```
share = costAmount / N
para cada asistente ≠ financiador:
  Debt(from: asistente, to: financiador, amount: share)
```

El financiador ya cubrió `costAmount` al municipio; internamente “pagó” su `share` y adelantó el resto.

Implementación: `web/src/lib/domain/split.ts` + sync en `web/src/lib/debts/sync.ts`.

### Match (resultado)

Resultado jugado en el contexto de una sesión. Hay **dos unidades independientes** (sin doble conteo):

| Unidad (`unit`) | Qué es | Entrada | Ranking |
|-----------------|--------|---------|---------|
| `game` | Game suelto (rotación 1v1) | 2 jugadores; ganador obligatorio al crear; `score` = `1-0`; Servidor opcional | Singles **Games**: ladder Elo (K=24) |
| `set` | Set a 6 (diff. 2, regla suave) | 2 jugadores; marcador opcional al crear (`En curso` → luego `6-4`) | Singles **Sets**: Elo (K=32); Dobles: 3 pts / victoria |

Un Set **no** se descompone en N Games para el ranking: el `6-4` es metadata del Set, no genera filas de Game.

| Campo | Notas |
|-------|--------|
| `playSessionId` | Obligatorio en MVP |
| `format` | `singles` \| `doubles` |
| `unit` | `game` \| `set` (default `set`; games sueltos solo singles en MVP) |
| `sideA` / `sideB` | Arrays de user ids (1 en singles, 2 en dobles) |
| `score` | Set: ej. `6-4`. Game: `1-0`. Vacío si En curso |
| `winnerSide` | `A` \| `B` \| `null`. `null` = **En curso** (jugadores elegidos, sin ganador); no cuenta en ranking |
| `serverSide` | Solo Games sueltos: `A` \| `B` \| `null`. Quién sacó (**Servidor**); opcional; no afecta ranking |
| `deletedAt` / `deletedById` | Soft-delete: no cuenta en ranking ni aparece en Resultados; queda para auditoría y **Restaurar** |

### MatchChangeLog (historial de resultados)

Registro append-only por fecha: quién agregó / editó / borró / restauró un resultado y cuándo. Visible para todos los miembros del grupo en el detalle de la fecha. Resumen en español + snapshot `before`/`after` (JSON). Módulo: `web/src/lib/matches/changelog.ts`.

**Borrar:** soft-delete (no hard delete). Cualquier `going` (ventana de resultados abierta) puede **Restaurar** desde el historial.

### Ranking

Vista agregada (on-read; no tabla persistida en MVP), **por grupo**:

- **Singles** — pestañas **Games** y **Sets**, ladders Elo **independientes** filtrados por `unit`  
- **Doubles** — solo Sets, 3 pts por victoria  

Solo cuentan matches con ganador (`winnerSide` no nulo), no borrados (`deletedAt` null), cuya `PlaySession.startsAt` ya pasó (`startsAt < now`; fechas futuras y En curso no suman). Al editar, soft-borrar o restaurar, el ladder se recalcula on-read (no hay ratings persistidos).

**Singles Elo** (`web/src/lib/ranking/elo.ts`): on-read, sin ratings persistidos. Ladders independientes por unit; en UI de Resumen se etiquetan **Elo.G** (Games, K=24) y **Elo.S** (Sets, K=32). Si nadie tiene resultados en el ladder, todos los miembros aparecen con **1000** (0–0); en cuanto hay al menos un resultado, solo figuran quienes ya jugaron. W/L binario (el marcador del set no pesa); orden cronológico `session.startsAt` → `match.createdAt`; lista ordenada por Elo desc, luego nombre (`es`). Games y Sets no se mezclan.

**Dobles puntos** (`web/src/lib/ranking/simple.ts`): 3 pts / set; 0 por derrota; desempate por wins, luego id.

**Resultados en una fecha:** cualquier asistente `going` puede agregar, editar, soft-borrar o restaurar Games sueltos y Sets singles (quien no marcó Voy no gestiona resultados). Hacen falta **dos jugadores distintos** (UI: cada select excluye al otro; servidor rechaza el mismo id). Un **Game** exige ganador al crear (Servidor opcional). Un **Set** sí puede quedar **En curso** sin marcador y completarse después. Plazo: ver **Ventanas temporales** (`startsAt + 2 h`).

**Resumen de fecha:** debajo de Resultados hay **Resumen Games** (siempre) y, solo si hubo Sets terminados, **Resumen Sets**. Cada bloque muestra W–L de esa unit en la fecha + rating inicio→fin del ladder correspondiente. En UI los ladders se etiquetan **Elo.G** (Games) y **Elo.S** (Sets); no se mezclan. Solo cuentan quienes terminaron al menos un match de esa unit; En curso / soft-delete no. El rating de inicio se calcula rejugando solo fechas **anteriores** (`session.startsAt` menor que el de esta fecha); nunca fechas posteriores. Así el fin de una fecha encadena con el inicio de la siguiente (por unit). Módulo: `web/src/lib/ranking/sessionResumen.ts`.

**Historial de cambios (UI):** en el detalle de la fecha, botón **Historial** junto a Resultados abre un modal con el changelog (no se muestra inline).

**Ranking al editar/borrar:** Elo/puntos se recalculan on-read desde los matches activos con ganador; soft-borrar o restaurar regenera el ladder en la siguiente carga.

### AvailabilitySnapshot (canchas libres)

Snapshot JSON publicado por el bot (`POST /api/availability/sync`). **Global** (sin `groupId`); se muestra en el hub del grupo (Fechas), no en el directorio root.

## Casos ejemplo

### Dos jugadores, cancha S/ 22

- Sesión jueves 15:00, costo 22, financiador Ana  
- Asistentes: Ana, Bruno (`going`)  
- Deuda: Bruno → Ana, S/ 11  

### Cuatro jugadores, cancha S/ 40

- Financiador Carlos  
- Going: Ana, Bruno, Carlos, Diana  
- Share = 10  
- Deudas: Ana→Carlos 10, Bruno→Carlos 10, Diana→Carlos 10  

## Glosario rápido

| Término | Significado |
|---------|-------------|
| Grupo | Contenedor de coordinación (`Group`) |
| Sesión / fecha | Fecha/hora reservada de cancha (`PlaySession`) |
| Financiador | Quien pagó la cancha al municipio |
| Asistencia / RSVP | Confirmación de quién va |
| Deuda | Cuánto debe A a B por una sesión |
| Match | Resultado (`game` o `set`) con ganador |
| Ranking Games / Sets | Singles: Elo por unit; dobles: 3 pts / set |
| Regalo de cancha | `financierCoversAll` — sin deudas |
| Canchas libres | Snapshot Miraflores vía bot (global) |
