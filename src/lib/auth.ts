import { cookies } from "next/headers";
import crypto, { createHmac, randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "session";
const SESSION_IDENTIFIER = "demo";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const APP_SECRET_PLACEHOLDER = "CHANGE_ME_TO_A_LONG_RANDOM_STRING";

function getSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is not set");
  }
  if (secret === APP_SECRET_PLACEHOLDER) {
    throw new Error("APP_SECRET must not use the public .env.example placeholder");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("APP_SECRET must contain at least 32 characters in production");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSignedSession(value: string = SESSION_IDENTIFIER) {
  const nonce = randomBytes(8).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${value}.${expiresAt}.${nonce}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySignedSession(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [value, expiresAtRaw, nonce, signature] = parts;
  if (!/^\d+$/.test(expiresAtRaw) || !/^[a-f0-9]{16}$/.test(nonce)) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${value}.${expiresAtRaw}.${nonce}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && value === SESSION_IDENTIFIER;
}

export function requireAuthCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;
  const sessionCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return false;
  try {
    const token = decodeURIComponent(sessionCookie.slice(SESSION_COOKIE_NAME.length + 1));
    return verifySignedSession(token);
  } catch {
    return false;
  }
}

export async function setSessionCookie() {
  const token = createSignedSession();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
