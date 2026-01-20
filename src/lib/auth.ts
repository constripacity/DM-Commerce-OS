import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "session";
const SESSION_IDENTIFIER = "demo";

function getSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is not set");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSignedSession(value: string = SESSION_IDENTIFIER) {
  const nonce = randomBytes(8).toString("hex");
  const payload = `${value}.${nonce}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySignedSession(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [value, nonce, signature] = parts;
  const payload = `${value}.${nonce}`;
  const expected = sign(payload);
  return signature === expected && value === SESSION_IDENTIFIER;
}

export function requireAuthCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;
  const sessionCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return false;
  const token = sessionCookie.split("=")[1];
  return verifySignedSession(token);
}

export function setSessionCookie() {
  const token = createSignedSession();
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
