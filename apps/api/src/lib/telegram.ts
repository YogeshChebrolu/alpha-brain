import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

function apiUrl(token: string, method: string) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramRequest<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(apiUrl(token, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(payload.description ?? `Telegram ${method} failed with ${response.status}`);
  }
  return payload.result;
}

export async function getMe(token: string) {
  return await telegramRequest<TelegramUser>(token, "getMe");
}

export async function setWebhook(token: string, webhookUrl: string, secretToken: string) {
  return await telegramRequest<boolean>(token, "setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string) {
  return await telegramRequest<boolean>(token, "deleteWebhook", { drop_pending_updates: true });
}

export async function sendMessage(token: string, chatId: string, text: string, replyMarkup?: unknown) {
  return await telegramRequest<unknown>(token, "sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  return await telegramRequest<boolean>(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export function randomTelegramSecret() {
  return randomBytes(32).toString("base64url");
}

export function tokenHint(token: string) {
  return token.slice(-6);
}

function encryptionKey() {
  const secret = process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("Set TELEGRAM_TOKEN_ENCRYPTION_KEY in apps/api/.env");
  return createHash("sha256").update(secret).digest();
}

export function encryptBotToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptBotToken(encryptedToken: string) {
  const [version, ivRaw, tagRaw, dataRaw] = encryptedToken.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !dataRaw) {
    throw new Error("Unsupported Telegram token encryption format");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function chunkTelegramText(text: string) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 3900) chunks.push(text.slice(i, i + 3900));
  return chunks.length ? chunks : ["I do not have a useful reply yet."];
}