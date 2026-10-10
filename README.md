# Llama Telegram AI Bot

**Llama v2.1.0** is a modern Telegram AI assistant developed by **Nadeem**. It runs on Cloudflare Workers and supports selectable AI modes, live web search, private personalization memory, voice input/output, stickers and emojis, contextual reactions, follow-up suggestions, and referral links.

Developer: https://github.com/nadeemmhdm

## Highlights

- AI identity: **Llama**
- `Llama Fast`, `Llama Smart`, and `Llama Reasoning` modes
- Improved welcome, help, about, settings, model, web, voice, memory, and invite screens
- Rich Telegram formatting: bold, italic, underline, strike, inline code, and code blocks
- Safe rendering of `<`, `>`, and `&`
- Thinking and web-search progress states
- Live web search with source details hidden behind a **Sources** button
- 2–4 contextual follow-up suggestions after responses
- Telegram voice-note understanding
- Optional **Text + Voice** reply mode
- Sticker and emoji intent understanding
- Context-aware Telegram reactions instead of one fixed reaction
- Private per-user personalization memory
- Personal referral links, invite counts, and invited-user views
- Admin user search and referral leaderboard
- Public GitHub activity lookup for developer/project questions
- Versioned Worker home and health endpoints
- D1 automatic read replication and Cloudflare global Worker execution

## Privacy model

Llama **does not store full user conversations or AI answer bodies in D1**.

Persistent D1 data is limited to operational state such as:

- Telegram user/profile identifiers required for the bot to operate
- selected model, web-search, and voice preferences
- useful non-sensitive personalization memories explicitly inferred from user messages
- referral metadata and invite counts
- admin operational logs
- short-lived response action metadata required by source/suggestion buttons

The old `conversations`, `responses`, and `reactions` tables were removed from production.

Personalization memory is scoped by Telegram user ID. Normal AI requests never query another user's memory.

## Telegram commands

```text
/start      Open Llama home
/models     Choose Llama mode
/web        Web-search settings
/search     Search the web once
/voice      Voice-reply settings
/memory     View private saved memory
/invite     Referral link, invite count, and invited users
/new        Start a fresh chat state
/settings   View current settings
/about      Version and developer information
/help       Help and commands
/ping       Service status
```

## Referral system

Each user receives a personal Telegram deep link:

```text
https://t.me/llamaaiofficial_bot?start=ref_<code>
```

When a new user starts Llama through that link, the inviter is recorded once. `/invite` shows the user's invite count and recent invited users.

Admin-only referral controls include an invite leaderboard.

## Admin controls

Admin commands are scoped to the configured admin Telegram chat and are not included in normal users' command scope.

```text
/admin
/admin_users
/admin_search <name|username|user-id>
/admin_user <user-id>
/admin_invites
/admin_message <user-id> <message>
/admin_block <user-id>
/admin_unblock <user-id>
/admin_stats
```

## Voice

- **Speech to text:** Telegram voice notes are transcribed before Llama answers.
- **Text to speech:** users can request a voice rendering of an answer.
- **Text + Voice mode:** when enabled, Llama sends the normal text response and a voice response.

## Stickers, emojis, and reactions

Llama understands Telegram sticker metadata such as the associated emoji and sticker-set name, while avoiding claims about visual details Telegram did not provide.

Incoming non-command messages can receive context-sensitive reactions such as ❤️, 😁, 🎉, 🔥, 🤔, 👨‍💻, 😢, or 👀. If Telegram rejects a selected reaction, the bot safely falls back.

## Web search and sources

Users can enable Web Search for normal messages or use `/search` for a one-time live lookup.

The main answer does not dump a full source list. When sources are available, Telegram shows a **Sources** button; source links are revealed only when the same user taps it.

## Developer context

When asked who built Llama, the assistant identifies **Nadeem** and links to:

```text
https://github.com/nadeemmhdm
```

Questions about recent public GitHub activity or public projects use live public GitHub data rather than a hard-coded project list.

## Architecture

```text
Telegram
   |
   v
Cloudflare Worker
   |-- Llama chat + live web search
   |-- Telegram rich UI / source / suggestion controls
   |-- Workers AI voice STT/TTS
   |-- D1
   |     |-- users + preferences
   |     |-- useful private memories
   |     |-- referral metadata
   |     |-- short-lived response actions
   |     `-- admin operational logs
   `-- public GitHub context when relevant
```

There is no single long-running Telegram bot process. Cloudflare Workers handle concurrent requests globally, and D1 read replication is enabled.

## Repository structure

```text
src/index.js      Telegram update router, commands, referrals, admin controls, status page
src/config.js     Version, model modes, messages, keyboards, URLs
src/telegram.js   Telegram API, formatting, reactions, voice transport
src/db.js         D1 user settings, memory, referrals, short-lived actions
src/ai.js         AI replies, search, suggestions, memory extraction, STT/TTS
schema.sql        D1 schema
wrangler.jsonc    Cloudflare Worker bindings/configuration
```

## Production

Worker:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev
```

Health:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev/health
```

Webhook:

```text
https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev/webhook
```

The Worker root page and health JSON expose the running Llama version and identify Nadeem as the developer with the GitHub profile link.

## Required bindings and secrets

Bindings:

```text
DB   Cloudflare D1
AI   Workers AI
```

Secrets:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
OLLAMA_API_KEY
ADMIN_CHAT_ID
```

Never commit real credentials to GitHub.

## Security

- Telegram webhook secret validation is enabled.
- Credentials remain encrypted Worker secrets.
- Personalization memory is always user-scoped.
- Source/suggestion callbacks verify ownership using Telegram user ID.
- Admin operations require the configured admin chat ID.
- Diagnostic/setup routes are not included in the production Worker.
- Public GitHub context only uses publicly visible activity.
