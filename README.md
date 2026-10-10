# llamaaiofficial_bot

A basic Telegram AI bot powered by the Ollama Cloud API and hosted on Cloudflare Workers.

## Architecture

Telegram -> Cloudflare Worker webhook -> Ollama Cloud API -> Telegram reply

No local Ollama installation is required.

## Features

- Cloudflare Workers webhook hosting
- Ollama Cloud direct API authentication
- `/start`, `/help`, `/ping`, `/model`
- Telegram typing indicator
- Long-response splitting
- Worker health endpoint
- Structured error logging
- API keys stored as Cloudflare secrets, never in GitHub

## Required secrets

- `TELEGRAM_BOT_TOKEN` — create a bot with `@BotFather`
- `OLLAMA_API_KEY` — create an API key in your Ollama account

Optional:

- `TELEGRAM_WEBHOOK_SECRET` — Telegram webhook secret-token validation

## Model

Default model:

```text
gpt-oss:120b
```

Change `OLLAMA_MODEL` in `wrangler.jsonc` if required.

## Local setup

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Add the real tokens to `.dev.vars`. This file is ignored by Git.

## Deploy to Cloudflare

Authenticate Wrangler and set the Worker secrets:

```bash
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put OLLAMA_API_KEY
npm run deploy
```

If you want Telegram webhook secret verification too:

```bash
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## Register Telegram webhook

After deployment, your webhook URL is:

```text
https://YOUR-WORKER.workers.dev/webhook
```

Register it with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR-WORKER.workers.dev/webhook"
```

If `TELEGRAM_WEBHOOK_SECRET` is configured in Cloudflare, register the same value with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR-WORKER.workers.dev/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Health check

Open:

```text
https://YOUR-WORKER.workers.dev/health
```

The endpoint returns service status and the configured model name without exposing secrets.

## Security

Never commit Telegram or Ollama credentials to GitHub. Use Cloudflare Worker secrets for production and `.dev.vars` only for local development.
