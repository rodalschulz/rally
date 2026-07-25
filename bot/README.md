# Bot — disponibilidad de canchas (Miraflores)

Script de Selenium que inicia sesión en el SSO de Miraflores, navega a la app de alquiler de canchas y captura la disponibilidad (API `disponibilidad`). Imprime un calendario en consola y genera HTML en `output/`.

## Setup

```bash
cd bot
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar EMAIL y PASSWORD
```

## Uso

```bash
python open_chrome.py
```

Variables útiles:

| Variable | Descripción |
|----------|-------------|
| `EMAIL` / `PASSWORD` | Credenciales SSO Miraflores |
| `BROWSER` | `chrome` (default) o `edge` |
| `CHROMEDRIVER_PATH` / `EDGEDRIVER_PATH` | Rutas opcionales al driver |

## Sync con rally (PC → Neon)

Tras scrapear, el bot puede publicar a la app:

```
RALLY_API_URL=http://localhost:3000
RALLY_CRON_SECRET=<igual que CRON_SECRET en web/.env>
```

Guía completa (Task Scheduler, Vercel): [`docs/PC_SYNC.md`](docs/PC_SYNC.md).
