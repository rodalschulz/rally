# Tenis — coordinación de partidos + bot de canchas

Monorepo para organizar partidos de tenis entre amigos (asistencias, quién paga la cancha, deudas, resultados y rankings) y, por separado, un bot que consulta horarios disponibles en la municipalidad de Miraflores.

## Estructura

```
tenis/
├── bot/          # Script Selenium: disponibilidad de canchas Miraflores
├── web/          # App Next.js (por crear): coordinación del grupo
├── docs/         # Visión, dominio y arquitectura
├── AGENTS.md     # Contexto para agentes / colaboradores
└── README.md
```

## Qué hace cada parte

| Carpeta | Rol |
|---------|-----|
| `bot/` | Automatiza login + scrape/API de disponibilidad de canchas. |
| `web/` | App social del grupo: sesiones, RSVP, financiador, saldos, matches, rankings. |
| `docs/` | Fuente de verdad de producto y diseño técnico. |

## Empezar

- **Bot:** ver [`bot/README.md`](bot/README.md)
- **App (rally):** `cd web && npm run dev` — ver [`web/README.md`](web/README.md)

## Deploy (Vercel)

Este repo es un **monorepo**. En Vercel:

1. Importá `rodalschulz/rally`
2. **Root Directory:** `web`
3. Env vars: ver [`web/docs/SETUP.md`](web/docs/SETUP.md) + `CRON_SECRET`

No subas solo `/web` al repo: conviene mantener `bot/` y `docs/` juntos.

## Documentación

1. [Visión del producto](docs/VISION.md) — qué construimos y por qué  
2. [Modelo de dominio](docs/DOMAIN.md) — sesiones, RSVP, financiador, deudas, rankings  
3. [Arquitectura](docs/ARCHITECTURE.md) — stack, datos, despliegue  
4. [AGENTS.md](AGENTS.md) — reglas y contexto para agentes de código  
