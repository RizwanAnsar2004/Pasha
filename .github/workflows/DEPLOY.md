# Deploy workflow (`deploy.yml`)

On every push to the **`deploy`** branch, GitHub Actions:
1. checks out the branch (which contains `next-standalone.tar.gz`, built + committed by the pre-push hook),
2. SSHes to the server, copies the tarball to `DEPLOY_PATH`,
3. extracts it, restarts the systemd service, and fails the run if the service isn't active.

## 1. Repository secrets to add
`Settings → Secrets and variables → Actions → New repository secret`

| Secret            | What it is                                                        |
|-------------------|-------------------------------------------------------------------|
| `SSH_PRIVATE_KEY` | Private SSH key (full contents, incl. `-----BEGIN…`/`END…` lines). Its **public** key must be in the server user's `~/.ssh/authorized_keys`. |
| `SERVER_HOST`     | Server URL or IP (e.g. `203.0.113.10` or `deploy.example.com`).   |
| `SERVER_USER`     | SSH username to log in as (e.g. `deploy`).                        |

## 2. Values you edit in `deploy.yml` (not secret)
At the top of the workflow, under `env:`:
- `DEPLOY_PATH` — folder on the server where the app runs (e.g. `/var/www/argaam-panel`).
- `SERVICE_NAME` — the systemd service to restart (e.g. `argaam-panel`).
- `SSH_PORT` — SSH port (default `22`).

## 3. Server prerequisites (one-time)

**a) Node.js installed**, and `DEPLOY_PATH` exists and is owned by `SERVER_USER`:
```sh
sudo mkdir -p /var/www/pasha-test
sudo chown deploy:deploy /var/www/pasha-test
```

**b) A systemd service** that runs the standalone server. Create
`/etc/systemd/system/argaam-panel.service`:
```ini
[Unit]
Description=Argaam Panel (Next.js standalone)
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/argaam-panel
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Restart=on-failure
User=deploy

[Install]
WantedBy=multi-user.target
```
Then:
```sh
sudo systemctl daemon-reload
sudo systemctl enable --now argaam-panel
```

**c) Passwordless sudo** for just the systemctl/journalctl commands the workflow
runs. `sudo visudo -f /etc/sudoers.d/deploy`:
```
deploy ALL=(root) NOPASSWD: /bin/systemctl restart argaam-panel, /bin/systemctl status argaam-panel, /bin/systemctl is-active argaam-panel, /bin/journalctl -u argaam-panel *
```
(Adjust binary paths with `which systemctl journalctl` if they differ.)

## Notes
- The tarball extracts **into** `DEPLOY_PATH`, so `server.js`, `.next/`, and
  `public/` land right where the service's `WorkingDirectory` expects them.
- Set your runtime secrets/env (DB URLs, API keys) in the systemd unit or an
  `EnvironmentFile=` — they are intentionally **not** in the tarball.
- Reminder: the tarball is built on Windows. If the app uses a native module
  like `sharp`, it may fail on Linux — see the deploy hook notes.
