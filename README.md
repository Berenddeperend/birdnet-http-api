# birdnet-api

JSON API for BirdNET-Pi. Reads `birds.db` directly (read-only).

## Install

From your Mac:

```bash
./install.sh              # defaults to birdnetpi.local
./install.sh 192.168.1.50 # or specify IP
./install.sh mypi.local pi # specify host + user
```

Re-run the same command to update.

## Endpoints

| Route | Description |
|---|---|
| `GET /api/today` | Species detected today |
| `GET /api/recent?limit=20` | Most recent detections |
| `GET /api/species?from=&to=` | Species in date range |
| `GET /api/daily?from=&to=` | Daily detection counts |
| `GET /api/hourly?from=&to=` | Hourly activity |
| `GET /api/report` | Weekly report (JSON) |
| `GET /health` | Health check |

## Management

```bash
# On the Pi:
sudo systemctl status birdnet-api
sudo systemctl restart birdnet-api
journalctl -u birdnet-api -f
```

## Configuration

Edit the systemd service to change env vars:

```bash
sudo systemctl edit birdnet-api
```

Add overrides like:

```ini
[Service]
Environment=CORS_ORIGIN=https://yourdomain.nl
Environment=PORT=3080
```

## Uninstall

```bash
sudo systemctl stop birdnet-api
sudo systemctl disable birdnet-api
sudo rm /etc/systemd/system/birdnet-api.service
sudo rm -rf /opt/birdnet-api
sudo systemctl daemon-reload
```


//

What the install script does:

rsyncs the project files to the Pi
Installs Node 20 if missing or outdated
Runs npm install
Auto-detects birds.db location
Creates and starts a birdnet-api systemd service on port 3080

Re-run the same command to update. Nothing touches the existing BirdNET-Pi setup -- it's a separate systemd service reading birds.db in read-only mode.
One thing to verify after install: the DB column names. SSH in and run sqlite3 ~/BirdNET-Pi/scripts/birds.db ".schema detections" to confirm they match (Com_Name, Sci_Name, Confidence, Date, Time).
