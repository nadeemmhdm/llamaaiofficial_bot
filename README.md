# Llama Telegram AI Bot

A Cloudflare Workers Telegram AI assistant named **Llama** with model switching, live web search, persistent preferences, conversation memory, and a cleaner interactive Telegram UI.

## Features

- AI identity: **Llama**
- `Llama Fast`, `Llama Smart`, and `Llama Reasoning` selectable modes
- Inline Telegram model/settings buttons
- Temporary **Llama is thinking…** message while generating
- Response generation-time footer
- Live web search with source links
- `/search <question>` for one-off live search
- Web Search ON/OFF preference
- Persistent per-user preferences and conversation memory using Cloudflare KV
- `/new` to clear conversation context without resetting settings
- Long-response splitting
- Telegram webhook secret validation
- Cloudflare Worker health endpoint
- Structured Worker logging
- Secrets kept outside GitHub

## Telegram commands

```text
/start      Open Llama
/models     Choose Llama model
/web        Web-search settings
/search     Search the web for one question
/new        Start a fresh conversation
/settings   View current settings
/help       Show help
/ping       Check service status
/about      About Llama
```

## Model modes

The Telegram UI exposes friendly Llama model names instead of infrastructure/backend model identifiers:

- **Llama Fast** — fast everyday replies
- **Llama Smart** — balanced quality and speed
- **Llama Reasoning** — harder questions and deeper reasoning

Backend model mappings are defined in `src/index.js` and can be changed independently from the Telegram-facing names.

## Web search

Users can either:

- run `/search your question` for a one-time live search, or
- enable **Web Search** from `/web` so normal conversations can use current web information.

When web search is used, Llama includes source links in the response.

## Persistent state

Cloudflare KV binding:

```text
USER_STATE
```

It stores each Telegram user's selected model, web-search preference, and a short conversation history.

## Required Worker configuration

Secrets:

```text
TELEGRAM_BOT_TOKEN
OLLAMA_API_KEY
TELEGRAM_WEBHOOK_SECRET
```

KV binding:

```text
USER_STATE
```

Never commit real API keys or Telegram tokens to GitHub.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Add local secrets to `.dev.vars`. The real `.dev.vars` file must remain ignored by Git.

## Deploy

```bash
npm run deploy
```

Production Worker:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev
```

Health endpoint:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev/health
```

Telegram webhook endpoint:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev/webhook
```

## Telegram webhook

Register the webhook with both update types required by the bot:

```text
message
callback_query
```

Use the same value configured as `TELEGRAM_WEBHOOK_SECRET` for Telegram's webhook `secret_token`.

## Security

- API credentials are Worker secrets, not source-code variables.
- Telegram webhook requests can be authenticated using `X-Telegram-Bot-Api-Secret-Token`.
- Secret comparison is performed without directly comparing the secret strings.
- Cloudflare KV is accessed through a Worker binding rather than REST credentials.
- Diagnostic/setup routes are not included in the production Worker.
