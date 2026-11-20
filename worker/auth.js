// Admin users, password hashing, sessions and login throttling. Everything lives in the CONTENT KV:
//   user:<id>                   user record (id = lowercase email, or "admin" for the default account)
//   session:<id>:<sha256(token)> server-side session, expires after SESSION_TTL
//   fail:<id> / failip:<ip>     recent failed logins (temporary lockout)
//   meta:bootstrapped           set once the default account has been created

export const SESSION_TTL = 60 * 60 * 8; // 8 hours
export const COOKIE = "adu_session";
const ITERATIONS = 100_000; // the maximum Workers' WebCrypto PBKDF2 allows
const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;
const IP_MAX_FAILS = 30;

const enc = new TextEncoder();
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomB64Url = (n) => toB64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

// ---- Passwords ---------------------------------------------------------------

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return toB64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), iterations: ITERATIONS, hash: await derive(password, salt, ITERATIONS) };
}

export async function checkPassword(password, rec) {
  return safeEqual(await derive(password, fromB64(rec.salt), rec.iterations), rec.hash);
}

// A throwaway record so unknown users cost the same time as real ones (no user enumeration by timing).
let dummy;
async function dummyCheck(password) {
  dummy ||= await hashPassword("not-a-real-password");
  await checkPassword(password, dummy);
}

const WEAK = new Set(["admin", "password", "password1", "123456789", "1234567890", "qwertyuiop", "letmein123"]);

// Returns an error message, or "" when the password is acceptable.
export function passwordProblem(pw, { id = "", email = "", current = "" } = {}) {
  pw = String(pw || "");
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 128) return "Use at most 128 characters.";
  if (WEAK.has(pw.toLowerCase())) return "That password is too common.";
  const lower = pw.toLowerCase();
  if ((id && lower === id.toLowerCase()) || (email && lower === email.toLowerCase())) return "The password can't be the same as your login.";
  if (current && pw === current) return "Choose a different password from the current one.";
  if (/^(.)\1+$/.test(pw)) return "Use a mix of characters.";
  return "";
}

// 32-character alphabet, so a random byte maps without bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function tempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => ALPHABET[b % 32]).join("").replace(/(.{4})(?=.)/g, "$1-");
}

// ---- Users ---------------------------------------------------------------------

export const normalizeId = (s) => String(s || "").trim().toLowerCase();
export const validId = (s) => /^[a-z0-9._%+@-]{1,120}$/.test(s);
const userKey = (id) => `user:${id}`;

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  disabled: Boolean(u.disabled),
  mustChange: Boolean(u.mustChange),
  createdAt: u.createdAt,
  createdBy: u.createdBy,
  lastLoginAt: u.lastLoginAt || null,
});

export const getUser = (env, id) => env.CONTENT.get(userKey(id), { type: "json" });
const putUser = (env, u) => env.CONTENT.put(userKey(u.id), JSON.stringify(u));

export async function listUsers(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.CONTENT.list({ prefix: "user:", cursor });
    for (const k of page.keys) {
      const u = await env.CONTENT.get(k.name, { type: "json" });
      if (u) out.push(u);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export async function createUser(env, { id, email, name, password, mustChange = true, createdBy }) {
  const rec = {
    id,
    email,
    name: name || "",
    ...(await hashPassword(password)),
    mustChange,
    disabled: false,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  await putUser(env, rec);
  return rec;
}

export async function setPassword(env, user, password, mustChange) {
  const next = { ...user, ...(await hashPassword(password)), mustChange };
  await putUser(env, next);
  await revokeSessions(env, user.id);
  return next;
}

export const updateUser = (env, user, patch) => putUser(env, { ...user, ...patch });
export const removeUser = async (env, id) => {
  await env.CONTENT.delete(userKey(id));
  await revokeSessions(env, id);
};

// The first time anyone tries to sign in, create the default account (admin / admin) that must
// change its password at first login. Done once; deleting it later does not bring it back.
export async function ensureBootstrap(env) {
  if (await env.CONTENT.get("meta:bootstrapped")) return;
  const existing = await env.CONTENT.list({ prefix: "user:", limit: 1 });
  if (!existing.keys.length) await createUser(env, { id: "admin", email: "", name: "Administrator", password: "admin", mustChange: true, createdBy: "system" });
  await env.CONTENT.put("meta:bootstrapped", "1");
}

// ---- Sessions --------------------------------------------------------------------

const sha256Hex = async (s) => toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export async function createSession(env, userId) {
  const token = randomB64Url(32);
  await env.CONTENT.put(`session:${userId}:${await sha256Hex(token)}`, JSON.stringify({ userId, createdAt: new Date().toISOString() }), { expirationTtl: SESSION_TTL });
  return token;
}

// The cookie value is "<userId>.<token>"; tokens are base64url so they never contain a dot,
// which lets us split on the last one even when the id is an email address.
const splitCookie = (v) => {
  const dot = String(v || "").lastIndexOf(".");
  return dot < 1 ? null : { userId: v.slice(0, dot), token: v.slice(dot + 1) };
};
const sessionKey = async (c) => `session:${c.userId}:${await sha256Hex(c.token)}`;

export async function readSession(env, cookie) {
  const c = splitCookie(cookie);
  if (!c) return null;
  const rec = await env.CONTENT.get(await sessionKey(c), { type: "json" });
  return rec && rec.userId === c.userId ? rec : null;
}

export async function destroySession(env, cookie) {
  const c = splitCookie(cookie);
  if (c) await env.CONTENT.delete(await sessionKey(c));
}

export async function revokeSessions(env, userId, exceptCookie) {
  const c = splitCookie(exceptCookie);
  const keep = c ? await sessionKey(c) : null;
  let cursor;
  do {
    const page = await env.CONTENT.list({ prefix: `session:${userId}:`, cursor });
    await Promise.all(page.keys.filter((k) => k.name !== keep).map((k) => env.CONTENT.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export const cookieValue = (userId, token) => `${userId}.${token}`;

export function sessionCookie(value, secure, maxAge = SESSION_TTL) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function readCookie(request) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(request.headers.get("Cookie") || "");
  return m ? decodeURIComponent(m[1]) : "";
}

// ---- Login throttling -------------------------------------------------------------

async function failState(env, key) {
  return (await env.CONTENT.get(key, { type: "json" })) || { n: 0 };
}

export async function isLocked(env, id, ip) {
  const [u, i] = await Promise.all([failState(env, `fail:${id}`), failState(env, `failip:${ip}`)]);
  return u.n >= MAX_FAILS || i.n >= IP_MAX_FAILS;
}

export async function recordFailure(env, id, ip) {
  for (const [key] of [[`fail:${id}`], [`failip:${ip}`]]) {
    const s = await failState(env, key);
    await env.CONTENT.put(key, JSON.stringify({ n: s.n + 1 }), { expirationTtl: LOCK_SECONDS });
  }
}

export const clearFailures = (env, id) => env.CONTENT.delete(`fail:${id}`);

// ---- Login ---------------------------------------------------------------------------

// Returns { user, token } or { error, status }.
export async function login(env, identifier, password, ip) {
  await ensureBootstrap(env);
  const id = normalizeId(identifier);
  if (!id || !password) return { error: "invalid_credentials", status: 401 };
  if (await isLocked(env, id, ip)) return { error: "locked", status: 429 };

  const user = await getUser(env, id);
  const ok = user ? await checkPassword(String(password), user) : (await dummyCheck(String(password)), false);
  if (!ok || user.disabled) {
    await recordFailure(env, id, ip);
    return { error: "invalid_credentials", status: 401 };
  }
  await clearFailures(env, id);
  const updated = { ...user, lastLoginAt: new Date().toISOString() };
  await putUser(env, updated);
  const token = await createSession(env, user.id);
  return { user: updated, cookie: cookieValue(user.id, token) };
}
