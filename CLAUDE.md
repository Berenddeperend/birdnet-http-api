# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Read-only JSON API for BirdNET-Pi. Runs on a Raspberry Pi alongside BirdNET-Pi, reading its `birds.db` SQLite database directly in read-only mode. Does not modify the BirdNET-Pi installation.

## Tech Stack

- **Runtime:** Node.js 18+ (ES modules)
- **Framework:** Fastify 5
- **Database:** better-sqlite3 (read-only access to BirdNET-Pi's `birds.db`)
- **Deployment:** systemd service on Raspberry Pi, installed via `install.sh`

## Commands

```bash
npm start              # Runs: node src/index.js
./install.sh           # Deploy to Pi (defaults to birdnetpi.local)
./install.sh <host>    # Deploy to specific Pi host
```

## Architecture

Three files make up the entire application:

- **`index.js`** — Fastify server setup, listens on `PORT` (default 3080)
- **`api.js`** — Route definitions (`/api/today`, `/api/recent`, `/api/species`, `/api/daily`, `/api/hourly`, `/api/report`, `/health`). Adds CORS headers via `onRequest` hook.
- **`db.js`** — SQLite queries against the `detections` table. Auto-detects `birds.db` location or uses `BIRDNET_DB` env var. Lazy-initializes a singleton DB connection.

**Note:** `package.json` start script references `src/index.js` but source files currently live in the project root. The `install.sh` script rsyncs a `src/` directory to the Pi.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3080` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `BIRDNET_DB` | auto-detected | Path to `birds.db` |
| `CORS_ORIGIN` | `*` | CORS allowed origin |

## Database Schema

The app queries a single table `detections` with columns: `Com_Name`, `Sci_Name`, `Confidence`, `Date` (YYYY-MM-DD string), `Time` (HH:MM:SS string).
