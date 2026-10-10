# Llama Telegram AI Bot

A modern Telegram AI assistant named **Llama**, deployed globally on Cloudflare Workers with private per-user memory, live web search, rich Telegram responses, voice support, and persistent D1 storage.

## Features

- AI identity: **Llama**
- `Llama Fast`, `Llama Smart`, and `Llama Reasoning` selectable modes
- **Llama is thinking…** / web-search progress states
- Rich Telegram formatting: bold, italic, underline, strike, inline code, and code blocks
- Safe rendering of characters such as `<`, `>`, and `&`
- Live web search with sources hidden behind a **Sources** button
- 2–4 contextual follow-up suggestion buttons after answers
- Click a suggestion to ask it automatically
- Per-user private conversation history and long-term personalization memory
- Memory isolation by Telegram user ID
- `/memory` to review saved personal memory
- `/new` to clear conversation history without resetting preferences
- Message reaction feedback
- Telegram voice-note understanding
- On-demand AI voice replies and optional automatic voice replies
- Public GitHub activity lookup for developer/project questions
- Response-time footer
- Long-response splitting
- Telegram webhook secret validation
- D1 read replication for globally distributed reads
- Structured Worker observability
- Secrets kept outside source control

## Telegram commands

```text
/start      Open Llama
/models     Choose Llama mode
/web        Web-search settings
/search     Search the web for one question
/voice      Voice-reply settings
/memory     View your saved memory
/new        Start a fresh conversation
/settings   View current settings
/help       Show help
```

## Model modes

The Telegram UI exposes friendly Llama mode names rather than backend model identifiers:

- **Llama Fast** — fast everyday replies
- **Llama Smart** — balanced quality and speed
- **Llama Reasoning** — deeper reasoning for harder questions

The mode mapping is kept in `src/config.js` so user-facing names can remain stable if backend models change.

## Web search

Users can either run `/search your question` for a one-time live search or enable **Web Search** from `/web`.

When search is used, source metadata is stored with that response in D1. The main AI message stays clean; source links are only shown after the same user taps the **Sources** button.

## Suggestions

After most AI responses, Llama creates 2–4 short follow-up suggestions. Tapping one sends that suggestion into the conversation automatically and generates the next response.

## Private memory and personalization

Llama stores user state in Cloudflare D1. Data is partitioned by Telegram user ID and normal conversation retrieval is always scoped to the current user.

Stored state can include:

- selected Llama mode
- web-search preference
- voice-reply preference
- recent conversation context
- non-sensitive personalization memories
- response metadata and feedback

Sensitive categories are excluded from automatic long-term memory extraction.

## Voice

Llama supports both directions:

- **Speech to text:** send a Telegram voice note and Llama transcribes it before answering.
- **Text to speech:** tap **Voice** below an answer, or enable automatic voice replies from `/voice`.

Voice inference runs through the Worker AI binding and may count toward the Cloudflare account's AI usage quota.

## Developer context

When users ask who built Llama, it identifies **Nadeem** as the developer and can link to:

```text
https://github.com/nadeemmhdm
```

Questions about recent public GitHub activity or recent public projects are resolved from live public GitHub data rather than a hard-coded project list.

## Architecture

```text
Telegram
   |
   v
Cloudflare Worker
   |-- Llama chat + web search
   |-- Workers AI voice STT/TTS
   |-- D1 database
   |     |-- users/preferences
   |     |-- private memories
   |     |-- conversation context
   |     |-- responses/sources/suggestions
   |     `-- feedback
   `-- Public GitHub context when relevant
```

D1 is configured with automatic read replication. The Worker itself runs on Cloudflare's global network, allowing concurrent Telegram users to be handled without a single long-running bot server.

## Repository structure

```text
src/index.js      Telegram update router and commands
src/config.js     Llama modes, UI text, keyboards
src/telegram.js   Telegram API, formatting, voice transport
src/db.js         D1 persistence and user-scoped data access
src/ai.js         AI replies, search, suggestions, memory and voice
schema.sql        D1 schema
wrangler.jsonc    Cloudflare Worker bindings/configuration
```

## Required infrastructure

The Worker uses:

- Cloudflare Workers
- Cloudflare D1 binding: `DB`
- Workers AI binding: `AI`
- encrypted Worker secrets defined in `wrangler.jsonc`

Never commit real API keys or Telegram tokens to GitHub.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Keep the real `.dev.vars` file out of source control.

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

Webhook endpoint:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev/webhook
```

## Security and privacy

- User memory and conversation lookups are scoped by Telegram user ID.
- Response callbacks verify response ownership before exposing sources, suggestions, voice output, or feedback state.
- Webhook requests can be authenticated with Telegram's secret-token header.
- Worker credentials remain encrypted secrets rather than repository variables.
- Diagnostic/setup routes are not part of the production Worker.
- Public GitHub context only uses information visible from the public GitHub APIs.
