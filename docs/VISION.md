# Visión del producto

## Origen

El repo empezó como un **bot** que revisa horarios disponibles de canchas de tenis en la app de la municipalidad de Miraflores (distrito donde vive el grupo).

Eso se mantiene en `bot/`, como herramienta auxiliar (y puede publicar “canchas libres” a la app).

## Destino

Una **app de coordinación** (**rally**) para un grupo de amigos que juegan tenis con regularidad: saber quién va, quién pagó la cancha, quién le debe a quién, qué partidos se jugaron y cómo van los rankings.

Stack actual: **Next.js + TypeScript + Tailwind** en **Vercel**, con **Auth.js (Google)** y **Neon/Prisma**. El backend vive en el mismo Next.js (Server Actions / Route Handlers). **Web Push** vive ahí también (VAPID + service worker). Un servicio aparte solo si aparece una necesidad clara (jobs a escala, WhatsApp/email, etc.).

## Problemas que resuelve

1. **Coordinación de asistencia** — Alguien reserva una fecha/hora; el resto marca si asiste. Todos ven la lista.
2. **Dinero de la cancha** — Quien paga al municipio aparece como **financiador**. El costo se reparte entre asistentes; el resto queda en deuda con el financiador hasta saldar.
3. **Resultados** — Registrar **Games** sueltos (quién ganó) y **Sets** (marcador tipo 6-4) en esa fecha, sin doble conteo.
4. **Rankings** — Elo singles con pestañas Games / Sets (sin ranking de dobles en MVP).
5. **Canchas libres (opcional)** — El bot de Miraflores alimenta un snapshot en Neon para ver horarios disponibles en Fechas.

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

### 4. Resultados y rankings

Tras (o durante) la sesión se cargan Games y/o Sets. El ranking usa Elo on-read por unidad (`game` vs `set`); Games y Sets son ladders independientes.

## Fuera de alcance (por ahora)

- Reservar la cancha automáticamente en Miraflores (el bot solo consulta disponibilidad).
- Pagos online reales (Yape/Plin vía pasarela / Niubiz): el MVP lleva **registro de deudas** + ayuda P2P (celular en perfil, sheet Pagar, WhatsApp). Sin cobro automático ni liquidación por rally.
- Ligas abiertas al público: es una app **de grupo cerrado** (amigos). Allowlist / invites más estrictos pueden llegar después; hoy el login es Google con el link.

## Principios de producto

- Pocos conceptos claros: sesión, asistencia, financiador, deuda, match, ranking.
- Mobile-friendly: la gente confirma desde el celular.
- Datos del grupo primero; el bot de Miraflores es opcional y desacoplado.
