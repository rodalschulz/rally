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

Dos tareas diarias (hora local de la PC):

| Tarea | Hora |
|-------|------|
| `RallyMirafloresSync11` | **11:00** |
| `RallyMirafloresSync23` | **23:00** |

- Ejecutan: `bot/run_sync.bat`
- Log: `bot/sync.log`
- No hay corridas intermedias

```bash
# Ver estado
schtasks /Query /TN "RallyMirafloresSync11" /V /FO LIST
schtasks /Query /TN "RallyMirafloresSync23" /V /FO LIST

# Recrear (borra y vuelve a crear)
schtasks /Delete /TN "RallyMirafloresSync11" /F
schtasks /Delete /TN "RallyMirafloresSync23" /F
schtasks /Create /TN "RallyMirafloresSync11" /TR "D:\coding\tenis\bot\run_sync.bat" /SC DAILY /ST 11:00 /IT /F
schtasks /Create /TN "RallyMirafloresSync23" /TR "D:\coding\tenis\bot\run_sync.bat" /SC DAILY /ST 23:00 /IT /F

# Correr ahora a mano
schtasks /Run /TN "RallyMirafloresSync11"

# Borrar
schtasks /Delete /TN "RallyMirafloresSync11" /F
schtasks /Delete /TN "RallyMirafloresSync23" /F
```

Si aún existe la tarea antigua horaria `RallyMirafloresSync`, bórrala:

```bash
schtasks /Delete /TN "RallyMirafloresSync" /F
```

Requisitos: PC encendida y sesión iniciada. Con `RALLY_API_URL` en Vercel no hace falta `npm run dev`.
