# Visión del producto

## Origen

El repo empezó como un **bot** que revisa horarios disponibles de canchas de tenis en la app de la municipalidad de Miraflores (distrito donde vive el grupo).

Eso se mantiene en `bot/`, como herramienta auxiliar.

## Destino

Convertir el proyecto en una **app de coordinación** para un grupo de amigos que juegan tenis con regularidad: saber quién va, quién pagó la cancha, quién le debe a quién, qué partidos se jugaron y cómo van los rankings.

Stack previsto de la app: **Next.js + TypeScript + Tailwind**, desplegable en **Vercel**. El backend puede vivir en el mismo Next.js (Route Handlers / Server Actions) al menos en el MVP; un servicio aparte solo si aparece una necesidad clara (jobs, notificaciones push, etc.).

## Problemas que resuelve

1. **Coordinación de asistencia** — Alguien reserva una fecha/hora; el resto marca si asiste. Todos ven la lista.
2. **Dinero de la cancha** — Quien paga al municipio aparece como **financiador** (u “host de pago”). El costo se reparte entre asistentes; el resto queda en deuda con el financiador hasta saldar.
3. **Resultados** — Registrar puntajes de los matches de esa sesión.
4. **Rankings** — Dos tablas: **singles** (prioridad) y **dobles**, derivadas de esos resultados.

## Flujos principales (MVP)

### 1. Crear sesión

Un miembro crea una **sesión** (fecha, hora, cancha opcional, costo en soles). Esa persona suele ser el financiador, pero el financiador puede asignarse aparte si alguien más pagó.

### 2. Confirmar asistencia (RSVP)

Cada miembro marca asistencia / no asistencia / pendiente. Solo los que asisten entran al reparto de costo (salvo reglas futuras explícitas).

### 3. Reparto y deudas

Ejemplo:

- Cancha: S/ 22  
- Asistentes: Ana (financiadora) y Bruno  
- Cada uno debe S/ 11 → Bruno le debe S/ 11 a Ana  

Con N asistentes: `costo / N` por cabeza. El financiador ya “pagó” su parte al municipio; los demás le deben su cuota.

Más adelante: marcar deudas como pagadas, saldos netos entre personas, historial.

### 4. Matches y rankings

Tras (o durante) la sesión se cargan resultados (singles y/o dobles). Los rankings se recalculan a partir de esos resultados. El ranking de **singles** es el más visible / importante.

## Fuera de alcance (por ahora)

- Reservar la cancha automáticamente en Miraflores (el bot solo consulta disponibilidad).
- Pagos online reales (Yape/Plin/Stripe): el MVP lleva **registro de deudas**, no cobro automático.
- Ligas abiertas al público: es una app **de grupo cerrado** (amigos).

## Principios de producto

- Pocos conceptos claros: sesión, asistencia, financiador, deuda, match, ranking.
- Mobile-friendly: la gente confirma desde el celular.
- Datos del grupo primero; el bot de Miraflores es opcional y desacoplado.
