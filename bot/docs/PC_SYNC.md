# Bot PC → Rally (opción A)

El scrape de Miraflores corre **en tu PC**. Los resultados se publican a Neon vía la API de rally.

## Flujo

1. `npm run dev` (o la app en Vercel) escucha `POST /api/availability/sync`
2. En la PC: `python open_chrome.py`
3. El bot loguea en Miraflores, arma horarios y hace POST a rally
4. En Fechas aparece **Canchas libres**

## Env

`web/.env`:

```
CRON_SECRET=<mismo-secret>
```

`bot/.env`:

```
RALLY_API_URL=http://localhost:3000
RALLY_CRON_SECRET=<mismo-secret>
```

En producción, `RALLY_API_URL=https://tu-app.vercel.app` (y el mismo `CRON_SECRET` en Vercel).

## Correr a mano

```bash
# terminal 1 — app
cd web
npm run dev

# terminal 2 — bot
cd bot
.\.venv\Scripts\activate
python open_chrome.py
```

Si ves `Synced to Rally: { ok: true, ... }`, recargá Fechas.

## Programar en Windows (Task Scheduler)

Tarea creada: **`RallyMirafloresSync`**

- Cada **30 minutos**
- De **07:00 a 00:00** (hora Perú / SA Pacific)
- Ejecuta: `bot/run_sync.bat`
- Log: `bot/sync.log`

```bash
# Ver estado
schtasks /Query /TN "RallyMirafloresSync" /V /FO LIST

# Correr ahora a mano
schtasks /Run /TN "RallyMirafloresSync"

# Borrar la tarea
schtasks /Delete /TN "RallyMirafloresSync" /F
```

Requisitos: PC encendida y sesión iniciada. Con `RALLY_API_URL` en Vercel no hace falta `npm run dev`.
