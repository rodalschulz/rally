# Bot — disponibilidad de canchas (Miraflores)

Script de Selenium que inicia sesión en el SSO de Miraflores, navega a la app de alquiler de canchas y captura la disponibilidad (API `disponibilidad`). Imprime un calendario en consola, genera HTML en `output/` y, si está configurado, publica el snapshot a **rally**.

## Setup

```bash
cd bot
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar EMAIL, PASSWORD y (opcional) RALLY_*
```

**No commitear** `.env`. Solo existe `.env.example` en git.

## Uso

```bash
python open_chrome.py
```

Variables:

| Variable | Descripción |
|----------|-------------|
| `EMAIL` / `PASSWORD` | Credenciales SSO Miraflores |
| `BROWSER` | `chrome` (default) o `edge` |
| `CHROMEDRIVER_PATH` / `EDGEDRIVER_PATH` | Rutas opcionales al driver |
| `RALLY_API_URL` | Base de la app (local o Vercel), ej. `http://localhost:3000` |
| `RALLY_CRON_SECRET` | Mismo valor que `CRON_SECRET` en `web/.env` |

## Sync con rally (PC → Neon)

Tras scrapear, el bot puede publicar a la app:

```
RALLY_API_URL=http://localhost:3000
RALLY_CRON_SECRET=<igual que CRON_SECRET en web/.env>
```

Guía completa (Task Scheduler, Vercel): [`docs/PC_SYNC.md`](docs/PC_SYNC.md).
