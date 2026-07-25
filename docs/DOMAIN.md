# Modelo de dominio

Lenguaje compartido para producto y código. Preferir estos nombres en UI, DB y PRs.

## Entidades

### Player (jugador / miembro)

Persona del grupo. Identidad mínima: nombre (o display name) + auth (definir en implementación: magic link, Google, o invite codes al inicio).

### Session (sesión / fecha de cancha)

Una reserva concreta:

| Campo | Notas |
|-------|--------|
| `startsAt` | Fecha y hora |
| `courtLabel` | Opcional (ej. cancha 30–41 según API Miraflores) |
| `costAmount` | Costo total en soles (ej. 22.50) |
| `currency` | Default `PEN` |
| `financierId` | Quién pagó la cancha (**financiador**) |
| `createdById` | Quién creó el registro |
| `status` | `scheduled` \| `completed` \| `cancelled` |

**Financiador:** término elegido para “quien adelantó el pago de la cancha”. En UI se puede mostrar como “Pagó la cancha” / “Financiador”.

### Attendance (asistencia / RSVP)

Relación Player ↔ Session:

| Campo | Notas |
|-------|--------|
| `status` | `going` \| `not_going` \| `maybe` \| `pending` |
| `updatedAt` | |

Regla MVP: entran al **reparto de costo** solo los `going` (y típicamente el financiador si también asiste; si el financiador no juega pero pagó, definir si sigue en el split — default propuesto: el split es entre asistentes `going`; si el financiador no está en `going`, igual se le debe el total menos… ver reglas abajo).

**Default propuesto (simple):**

- El costo se divide en partes iguales entre jugadores con `going`.
- El financiador debe estar entre los `going` en el caso normal.
- Si el financiador no asiste pero pagó, los `going` le deben `costo / N` cada uno (N = número de `going`); el financiador no “consume” una parte porque no juega — o sea recibe el 100% del costo repartido entre quienes sí van.  
  *(Confirmar con el grupo si preferís incluir siempre al financiador en N aunque no juegue.)*

### Debt (deuda)

Obligación de pago entre dos jugadores, normalmente derivada de una sesión:

| Campo | Notas |
|-------|--------|
| `fromPlayerId` | Quien debe |
| `toPlayerId` | Quien recibe (casi siempre el financiador) |
| `sessionId` | Origen |
| `amount` | |
| `status` | `open` \| `settled` |
| `settledAt` | Opcional |

Fórmula base (financiador asiste, N asistentes `going`):

```
share = costAmount / N
para cada asistente ≠ financiador:
  Debt(from: asistente, to: financiador, amount: share)
```

El financiador ya cubrió `costAmount` al municipio; internamente “pagó” su `share` y adelantó el resto.

### Match (partido)

Resultado jugado en el contexto de una sesión (o suelto, si más adelante se permite):

| Campo | Notas |
|-------|--------|
| `sessionId` | Preferible |
| `format` | `singles` \| `doubles` |
| `sideA` / `sideB` | 1 jugador (singles) o 2 (dobles) |
| `score` | Estructura de sets/gameses (definir encoding en implementación) |
| `winnerSide` | `A` \| `B` (derivable del score) |

### Ranking

Vista agregada, no necesariamente tabla persistida:

- **Singles ranking** — principal  
- **Doubles ranking** — secundario  

Algoritmo exacto (ELO, W-L, puntos por set, etc.) **aún no cerrado**. Documentar la decisión en `docs/` cuando se elija e implementar un módulo puro (`web/src/lib/ranking/…`) fácil de cambiar.

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
| Sesión | Fecha/hora reservada de cancha |
| Financiador | Quien pagó la cancha al municipio |
| Asistencia / RSVP | Confirmación de quién va |
| Deuda | Cuánto debe A a B por una sesión (u otro concepto) |
| Match | Partido con score |
| Ranking singles/dobles | Ordenamiento por resultados |
