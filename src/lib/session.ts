/**
 * 데모용 직원 로그인. 비밀번호 하나(ADMIN_PASSWORD)와 직원 이름으로 들어가고,
 * HMAC으로 서명한 쿠키에 이름과 만료 시각을 담습니다. Edge(middleware)와 Node 양쪽에서 쓰도록 Web Crypto만 사용합니다.
 */
export const COOKIE = "qs_staff";
const MAX_AGE_SEC = 60 * 60 * 8;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("SESSION_SECRET(16자 이상)를 설정하세요.");
  }
  return "local-demo-secret-change-me";
}

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function createToken(name: string, now = Date.now()): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ n: name, e: Math.floor(now / 1000) + MAX_AGE_SEC })));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyToken(token: string | undefined, now = Date.now()): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff) return null;
  try {
    const { n, e } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return typeof n === "string" && typeof e === "number" && e * 1000 > now ? n : null;
  } catch {
    return null;
  }
}

export const sessionMaxAge = MAX_AGE_SEC;

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || (process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production" ? "demo1234" : "");
}
