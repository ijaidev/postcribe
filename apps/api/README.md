## PostCribe API

### Install

```sh
bun install
```

### Local development

```sh
bun run dev
# http://localhost:3000
```

### Run with Docker locally (optional)

Build from the repo root and run mapping all vars from your `.env`:

```bash
# Build
docker build -t postcribe-api -f apps/api/Dockerfile .

# Run (maps all .env variables into the container)
docker run -d \
  --name postcribe-api \
  --env-file ./.env \
  -p 30011:3000 \
  --restart unless-stopped \
  postcribe-api
```

Notes:

- The container listens on port 3000 internally. Map host ports as needed (e.g., `30011:3000`).

---

## Deploy to Heroku (Container stack)

Prerequisites:

```bash
heroku login
heroku container:login
```

First-time app setup (replace APP with your Heroku app name, e.g., `postcribe-server`):

```bash
# If you need to create an app first
# heroku apps:create APP

# Switch stack to container (one-time)
heroku stack:set container -a APP
```

Build and push the image from the repo root:

```bash
docker build -f apps/api/Dockerfile -t registry.heroku.com/APP/web .
docker push registry.heroku.com/APP/web
```

Release the image:

```bash
heroku container:release web -a APP
```

Open and view logs:

```bash
heroku open -a APP
heroku logs --tail -a APP
```

### Environment variables (Config Vars)

If you see `Missing SMTP configuration. Please check your .env file` in logs, set the required config vars. Two ways:

- Set individually:

```bash
heroku config:set -a APP \
  SMTP_HOST=your_host \
  SMTP_PORT=587 \
  SMTP_USER=your_user \
  SMTP_PASS=your_pass \
  NODE_ENV=production \
  ENVIRONMENT=production \
  DATABASE_URL=postgres://... \
  BETTER_AUTH_URL=https://your-auth-endpoint \
  API_URL=https://your-api-url \
  CLIENT_URL=https://your-frontend
```

- Push from your local `.env` (overwrites existing; requires plugin):

```bash
heroku plugins:install heroku-config
heroku config:push -a APP
```

- Optional (no plugin; bash one-liner):

```bash
# Uses your current default Heroku app (set via `heroku git:remote -a APP`)
heroku config:set $(grep -v '^#' .env | xargs)

# Or explicitly target an app
heroku config:set $(grep -v '^#' .env | xargs) -a APP
```

### Prisma migrations (if using the DB)

```bash
heroku run -a APP bunx prisma migrate deploy
```

### Quick reference

```bash
# Switch stack (once)
heroku stack:set container -a APP

# Build + push + release
docker build -f apps/api/Dockerfile -t registry.heroku.com/APP/web .
docker push registry.heroku.com/APP/web
heroku container:release web -a APP

# Open + logs
heroku open -a APP
heroku logs --tail -a APP
```

To install dependencies:

```sh
bun install
```

To run:

```sh
bun run dev
```

open http://localhost:3000
