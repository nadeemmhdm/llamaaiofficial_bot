# Llama Telegram AI Bot

**Llama v2.3.0** is a personalized Telegram AI assistant developed by **Nadeem**. It runs on Cloudflare Workers with D1 persistence, live web search, voice input/output, image and text/code file analysis, private personalization memory, referrals, Free/Paid plans, Telegram Stars subscriptions, coupons, and Llama Coin rewards.

Developer: https://github.com/nadeemmhdm

## Highlights

- Llama birthday: **March 2, 2026**
- First-time onboarding: preferred name, optional gender, optional DOB, and position
- Profile fields are injected as authoritative context for personalized replies
- Live current date, weekday and time context in **Asia/Kolkata**
- Automatic birthday wishes at **00:00 Asia/Kolkata**
- Image analysis for Telegram photos and JPG/PNG/WebP documents
- Direct analysis for TXT, Markdown, JSON, CSV, logs and common source-code/text formats
- Uploaded file bytes are processed transiently; no R2/KV/file-storage copy is created
- Free and Paid monthly plans
- Free users use **Llama Fast** only
- Paid unlocks Llama Smart, Llama Reasoning, higher monthly limits, and voice selection
- Telegram Stars recurring subscription checkout: **99 XTR / 30 days**
- Referral rewards with separate in-bot **Llama Coins**
- 100 Llama Coins can redeem 7 Paid days, with an optional **Redeem All** action for multiple full 100-coin blocks
- Coupon codes can grant Paid days and/or bonus Llama Coins with zero payment
- Voice selection: Luna, Asteria, Orion, Athena, Arcas
- Telegram voice-note understanding and optional Text + Voice replies
- Web search with sources hidden behind a Sources button
- Context-aware animated thinking messages
- 2–4 contextual suggested follow-up buttons
- Sticker and emoji understanding from Telegram metadata
- Context-aware Telegram message reactions
- Public GitHub context for developer/project questions
- Owner-only user search, subscription, coupon, coin, messaging and account controls

## Image and file analysis

Users can send a Telegram photo or supported document directly. A caption can be used as the analysis instruction, for example:

```text
Find the error in this screenshot
Summarize this JSON file
Explain this Python code
Check this CSV structure
```

Supported image formats currently include JPG/JPEG, PNG and WebP.

Supported textual files include TXT, Markdown, JSON/JSONL, CSV/TSV, JavaScript/TypeScript, Python, Java, C/C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, HTML/CSS, XML, YAML, TOML, INI/config files, logs, SQL, shell/PowerShell/batch files and similar UTF-8 text formats.

Direct file-analysis limit is **8 MB**. Very large textual files are capped to the first 70,000 characters for model context, and the model is explicitly told when content was truncated.

PDF, DOCX, XLSX and PPTX are not directly parsed by the current lightweight no-extra-storage media path.

### Storage behavior

Llama does not create a persistent copy of uploaded Telegram images or files. The Worker obtains the file from Telegram for the current request, processes it in memory, and discards the request bytes after execution. D1 does not store uploaded file bodies.

Image analysis uses the Workers AI allocation bound to the Worker. Text/code file analysis uses the normal Llama chat path after transient text extraction.

## Privacy model

Llama does **not** persist full user conversations, AI answers, or uploaded file bodies in D1.

Persistent data is limited to operational/account data such as:

- Telegram user/account identifiers required to deliver the bot
- onboarding profile fields
- selected plan/model/web/voice preferences
- monthly usage counters
- durable non-sensitive personalization memories
- referral/invite relationships and Llama Coin ledger
- coupon redemption metadata
- Telegram Stars transaction identifiers/status required for subscription management
- short-lived source/suggestion action metadata

Normal memory lookups are scoped by Telegram user ID. Media/file prompts use `skipMemory` so file contents are not extracted into durable personalization memory.

## Plans

### Free

- Llama Fast only
- 100 AI replies/month
- 5 web searches/month
- 10 voice inputs/month
- 10 voice outputs/month
- Luna voice

### Paid

- 99 Telegram Stars every 30 days
- Llama Fast, Smart and Reasoning
- 1000 AI replies/month
- 100 web searches/month
- 200 voice inputs/month
- 200 voice outputs/month
- all configured Llama voices

Plan constants live in `src/config.js` and can be changed without changing the user-facing architecture.

## Referral rewards

A valid referral gives:

- inviter: +25 Llama Coins
- invited user: +10 Llama Coins

100 Llama Coins can be exchanged for 7 Paid days. If multiple full 100-coin blocks are available, **Redeem All** exchanges all complete blocks in one atomic redemption and leaves the remainder. Llama Coins are internal bot rewards and are **not Telegram Stars**.

## User commands

```text
/start      Open Llama / continue onboarding
/plan       Free/Paid plan and checkout
/models     Choose AI mode
/web        Web-search settings
/search     One-time web search
/voice      Voice-reply and voice-selection settings
/profile    View or restart profile setup
/memory     View private personalization memory
/rewards    Coins and referral rewards
/redeem     Redeem a coupon code
/invite     Personal invite link and invite count
/settings   Preferences
/about      Version, birthday and developer
/help       Help
/ping       Service status
```

Images/files do not require a command: simply send the photo/document, optionally with a caption describing what Llama should do.

## Birthday scheduler

Cloudflare Cron Trigger:

```text
30 18 * * *
```

Cloudflare cron runs in UTC. `18:30 UTC` corresponds to `00:00 Asia/Kolkata` on the following calendar day. The scheduled handler checks the current India date, sends user birthday wishes once per year, and announces Llama's birthday on March 2 once per user/year.

## Telegram Stars subscriptions

The bot uses Telegram's `XTR` currency for the Paid digital subscription. Access is activated only after Telegram delivers a valid `successful_payment` matching the expected subscription payload and amount. The recurring period is 30 days.

Subscription charge IDs are retained only for subscription management such as canceling renewal.

## Coupons

Owner-only coupon creation supports:

```text
/admin_coupon CODE PAID_DAYS BONUS_COINS MAX_USES VALID_DAYS
```

A coupon can grant Paid access, Llama Coins, or both without charging the user. Coupons support expiry, usage caps, one redemption per user, listing, and disabling.

## Architecture

```text
Telegram
   |
   v
Cloudflare Worker
   |-- Llama chat + web search
   |-- transient Telegram image/file download
   |-- image understanding via Workers AI
   |-- text/code file decoding + Llama analysis
   |-- Telegram Stars subscription flow
   |-- scheduled birthday job
   |-- Workers AI speech-to-text / text-to-speech
   |-- D1
   |     |-- users / profiles / plan state
   |     |-- private useful memories
   |     |-- monthly usage
   |     |-- referrals / Llama Coins
   |     |-- coupons / redemptions
   |     |-- payments metadata
   |     `-- short-lived source/suggestion actions
   `-- Public GitHub context when relevant
```

## Repository structure

```text
src/index.js      Telegram router, onboarding, media routing, plans, payments, scheduler
src/config.js     UI, plan/model/voice constants and keyboards
src/telegram.js   Telegram API, generic file download, reactions, formatting and voice transport
src/db.js         D1 account, profile, quota, reward and subscription storage
src/ai.js         AI replies, live IST/profile grounding, search, memory, quotas and voice
src/media.js      transient image and text/code file analysis
schema.sql        D1 schema
wrangler.jsonc    Worker bindings and midnight-IST cron
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

Bot:

```text
https://t.me/llamaaiofficial_bot
```

## Security

- Telegram webhook secret validation
- Worker secrets stay outside GitHub
- per-user memory/action ownership checks
- successful-payment payload and amount validation before Paid activation
- coupon caps, expiration, one-redemption-per-user protection
- uploaded file bytes are not persisted to D1/R2/KV
- file/image analysis is size-limited and request-scoped
- no full conversation or AI answer persistence in D1
