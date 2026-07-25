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

**Borrar fecha:** si `startsAt` ya pasó, solo el `createdById`. Si aún es futura, creador o financiador. Borrar cascada (asistencias, deudas, matches) → esos games dejan de contar en el ranking.

**Discovery:** el root lista solo grupos `public`. Los privados no aparecen; se entra solo por invite/link (+ contraseña).

**Membresía (`GroupMember`):** `role` = `owner` \| `member`. Owner = creador. Cualquier miembro puede coordinar fechas; solo owner edita ajustes / invite (MVP: create + copy invite).

**Salir del grupo** (`/grupos/[slug]/ajustes`): cualquier miembro puede abandonar. Si es el único miembro, el grupo se elimina (cascada de fechas/deudas/matches). Si es dueño y hay más integrantes, el dueño pasa al miembro con `joinedAt` más antiguo.

**Eliminar grupo** (`/grupos/[slug]/ajustes`, solo owner): borra el grupo entero y cascada (fechas, deudas, matches, membresías), aunque haya más integrantes.

**Borrar cuenta** (`/ajustes`): el usuario sale de todos los grupos (mismas reglas) y se elimina el `User` (Auth accounts/sessions, asistencias; deudas que lo involucran; scrub de ids en matches).

**Jugadores del grupo** = miembros (`GroupMember` → `User`), no todos los users globales.

## Entidades

### Player (jugador / miembro)

Persona del grupo. En código: modelo Prisma `User` (Auth.js). Identidad: Google OAuth + `displayName` / `shortName` (derivados del perfil). Scoped al grupo vía `GroupMember`.

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

### Attendance (asistencia / RSVP)

Relación Player ↔ Session (`userId` + `playSessionId`):

| Campo | Notas |
|-------|--------|
| `status` | `going` \| `not_going` \| `maybe` \| `pending` |
| `updatedAt` | |

Regla MVP: entran al **reparto de costo** solo los `going`.

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
| `playSessionId` | Origen |
| `amount` | |
| `status` | `open` \| `settled` |
| `settledAt` | Opcional |

Scoped al grupo al filtrar deudas por `playSession.groupId`.

Fórmula base (financiador asiste, N asistentes `going`):

```
share = costAmount / N
para cada asistente ≠ financiador:
  Debt(from: asistente, to: financiador, amount: share)
```

El financiador ya cubrió `costAmount` al municipio; internamente “pagó” su `share` y adelantó el resto.

Implementación: `web/src/lib/domain/split.ts` + sync en `web/src/lib/debts/sync.ts`.

### Match (partido)

Resultado jugado en el contexto de una sesión:

| Campo | Notas |
|-------|--------|
| `playSessionId` | Obligatorio en MVP |
| `format` | `singles` \| `doubles` |
| `sideA` / `sideB` | Arrays de user ids (1 en singles, 2 en dobles) |
| `score` | String (encoding simple en MVP) |
| `winnerSide` | `A` \| `B` |

### Ranking

Vista agregada (on-read; no tabla persistida en MVP), **por grupo**:

- **Singles ranking** — principal  
- **Doubles ranking** — secundario  

Solo cuentan matches cuya `PlaySession.startsAt` ya pasó (fechas futuras no suman).

**MVP cerrado:** 3 puntos por victoria, 0 por derrota; desempate por wins, luego id. Módulo: `web/src/lib/ranking/simple.ts`. ELO u otro algoritmo queda como evolución futura (cambiar el módulo puro sin tocar UI de más).

**Games en una fecha:** cualquier asistente `going` puede agregar, editar o borrar singles. Hacen falta dos jugadores distintos al confirmar.

**Chat de fecha (`SessionChatMessage`):** miembros del grupo leen el hilo. Escriben solo `going` / `maybe` mientras `startsAt` no haya pasado; después queda solo como registro. Cascade al borrar la fecha.

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
| Match | Partido con score |
| Ranking singles/dobles | Ordenamiento por resultados (3 pts/win en MVP) |
| Canchas libres | Snapshot Miraflores vía bot (global) |
