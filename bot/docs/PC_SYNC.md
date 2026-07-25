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

1. Crear `bot/run_sync.bat` (ya incluido) o usá el existente
2. Task Scheduler → Create Basic Task → Daily / cada hora
3. Action: Start a program → `D:\coding\tenis\bot\run_sync.bat`
4. “Run whether user is logged on or not” solo si querés; para headless Chrome suele bastar “when logged on”
5. La PC tiene que estar encendida

Nota: con `RALLY_API_URL` apuntando a Vercel, **no** hace falta tener `npm run dev` abierto; solo el bot en la PC.
