const OLLAMA_API_URL = "https://ollama.com/api/chat";
const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return Response.json({
        ok: true,
        service: "llamaaiofficial_bot",
        runtime: "Cloudflare Workers",
        model: env.OLLAMA_MODEL || "gpt-oss:120b",
      });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.OLLAMA_API_KEY) {
      console.error(JSON.stringify({ event: "missing_required_secrets" }));
      return new Response("Worker is not configured", { status: 503 });
    }

    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      if (supplied !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    ctx.waitUntil(handleTelegramUpdate(update, env));
    return new Response("OK", { status: 200 });
  },
};

async function handleTelegramUpdate(update, env) {
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();

  if (!chatId || !text) return;

  console.log(JSON.stringify({
    event: "telegram_message",
    update_id: update?.update_id,
    chat_id: chatId,
    has_text: true,
  }));

  const command = text.split(/\s+/)[0].toLowerCase().split("@")[0];

  if (command === "/start") {
    await sendTelegramMessage(env, chatId,
      "Hello! I am an AI bot powered by Ollama Cloud.\n\nSend me a message and I will reply using AI.\n\nCommands:\n/help - show help\n/model - show AI model\n/ping - check bot status"
    );
    return;
  }

  if (command === "/help") {
    await sendTelegramMessage(env, chatId,
      "Commands:\n/start - start the bot\n/help - show this help\n/model - show active model\n/ping - bot status\n\nJust send any normal text message to chat with the AI."
    );
    return;
  }

  if (command === "/ping") {
    await sendTelegramMessage(env, chatId, "Pong! Bot is online.");
    return;
  }

  if (command === "/model") {
    await sendTelegramMessage(env, chatId, `Active model: ${env.OLLAMA_MODEL || "gpt-oss:120b"}`);
    return;
  }

  try {
    await sendTelegramAction(env, chatId, "typing");

    const answer = await askOllama(env, text);
    const chunks = splitTelegramText(answer);

    for (const chunk of chunks) {
      await sendTelegramMessage(env, chatId, chunk);
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "bot_error",
      message: error instanceof Error ? error.message : String(error),
    }));

    try {
      await sendTelegramMessage(
        env,
        chatId,
        "AI service is temporarily unavailable. Please try again in a moment."
      );
    } catch (sendError) {
      console.error(JSON.stringify({
        event: "telegram_error_reply_failed",
        message: sendError instanceof Error ? sendError.message : String(sendError),
      }));
    }
  }
}

async function askOllama(env, userText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL || "gpt-oss:120b",
        messages: [
          {
            role: "system",
            content: env.SYSTEM_PROMPT || "You are a helpful Telegram AI assistant. Give clear and concise answers.",
          },
          { role: "user", content: userText },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama API ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data?.message?.content?.trim();

    if (!content) {
      throw new Error("Ollama returned an empty response");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTelegramMessage(env, chatId, text) {
  const response = await fetch(`${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function sendTelegramAction(env, chatId, action) {
  const response = await fetch(`${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });

  if (!response.ok) {
    console.warn(JSON.stringify({ event: "telegram_action_failed", status: response.status }));
  }
}

function splitTelegramText(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf("\n", maxLength);
    if (cut < Math.floor(maxLength * 0.5)) {
      cut = remaining.lastIndexOf(" ", maxLength);
    }
    if (cut < Math.floor(maxLength * 0.5)) cut = maxLength;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
