# Llama Telegram AI Bot

**Llama v2.2.0** is a personalized Telegram AI assistant developed by **Nadeem**. It runs on Cloudflare Workers with D1 persistence, live web search, voice input/output, private personalization memory, referrals, Free/Paid plans, Telegram Stars subscriptions, coupons, and Llama Coin rewards.

Developer: https://github.com/nadeemmhdm

## Highlights

- Llama birthday: **March 2, 2026**
- First-time onboarding: preferred name, optional gender, optional DOB, and position
- Personalized responses using profile fields and durable non-sensitive memory
- Automatic birthday wishes at **00:00 Asia/Kolkata**
- Free and Paid monthly plans
- Free users use **Llama Fast** only
- Paid unlocks Llama Smart, Llama Reasoning, higher monthly limits, and voice selection
- Telegram Stars recurring subscription checkout: **99 XTR / 30 days**
- Referral rewards with separate in-bot **Llama Coins**
- 100 Llama Coins can redeem 7 Paid days
- Coupon codes can grant Paid days and/or bonus Llama Coins with zero payment
- Voice selection: Luna, Asteria, Orion, Athena, Arcas
- Telegram voice-note understanding and optional Text + Voice replies
- Web search with sources hidden behind a Sources button
- 2–4 contextual suggested follow-up buttons
- Sticker and emoji understanding from Telegram metadata
- Context-aware Telegram message reactions
- Public GitHub context for developer/project questions
- Owner-only user search, subscription, coupon, coin, messaging and account controls

## Privacy model

Llama does **not** persist full user conversations or AI answers in D1.

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

Normal memory lookups are scoped by Telegram user ID.

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

100 Llama Coins can be exchanged for 7 Paid days. Llama Coins are internal bot rewards and are **not Telegram Stars**.

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
src/index.js      Telegram router, onboarding, plans, payments, scheduler
src/config.js     UI, plan/model/voice constants and keyboards
src/telegram.js   Telegram API, reactions, formatting and voice transport
src/db.js         D1 account, profile, quota, reward and subscription storage
src/ai.js         AI replies, search, memory extraction, quotas and voice
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
- no full conversation or AI answer persistence in D1
