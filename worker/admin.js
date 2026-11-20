// Admin API: /api/admin/*
//
// Who can call it:
//   * Admin users signed in with email + password (session cookie). Managed under "Admin users".
//     The first sign-in bootstraps a default account (admin / admin) that must change its password.
//   * Optional break-glass / automation principals, treated as super-admins with no password change:
//       ADMIN_TOKEN                          "Authorization: Bearer <token>"
//       ACCESS_TEAM_DOMAIN + ACCESS_AUD      Cloudflare Access JWT
// Storage: KV namespace bound as CONTENT.
import { defaultContent, validateContent } from "../scripts/store.mjs";
import { renderContent } from "./site.js";
import * as A from "./auth.js";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

const MAX_BODY = 1_500_000;
const HISTORY_TTL = 60 * 60 * 24 * 120;

// ---- Optional Cloudflare Access / token principals -------------------------------------

const b64uToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const b64uToJson = (s) => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));

let jwks = { at: 0, keys: [] };
async function getKeys(domain) {
  if (Date.now() - jwks.at < 10 * 60 * 1000 && jwks.keys.length) return jwks.keys;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("certs " + res.status);
  jwks = { at: Date.now(), keys: (await res.json()).keys || [] };
  return jwks.keys;
}

async function verifyAccessJwt(token, env) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const header = b64uToJson(h);
  const payload = b64uToJson(p);
  const jwk = (await getKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64uToBytes(s), new TextEncoder().encode(`${h}.${p}`)))) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD) || payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload.email || payload.sub || "access-user";
}

// Returns { who, user?, superuser?, cookie? } or null.
async function authenticate(request, env) {
  const cookie = A.readCookie(request);
  if (cookie && env.CONTENT) {
    const sess = await A.readSession(env, cookie);
    const user = sess && (await A.getUser(env, sess.userId));
    if (user && !user.disabled) return { who: user.email || user.id, user, cookie };
  }
  if (env.ADMIN_TOKEN) {
    const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
    if (m && A.safeEqual(m[1], env.ADMIN_TOKEN)) return { who: "admin-token", superuser: true };
  }
  if (env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) {
    const m = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get("Cookie") || "");
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion") || (m && m[1]);
    if (jwt) {
      try {
        const who = await verifyAccessJwt(jwt, env);
        if (who) return { who, superuser: true };
      } catch (err) {
        console.error("access verify failed", err);
      }
    }
  }
  return null;
}

// ---- Helpers --------------------------------------------------------------------------

async function readJson(request, limit = MAX_BODY) {
  const raw = await request.text();
  if (raw.length > limit) return { error: json({ ok: false, error: "too_large" }, 413) };
  try {
    return { body: JSON.parse(raw || "{}") };
  } catch {
    return { error: json({ ok: false, error: "bad_json" }, 400) };
  }
}

const readEnvelope = (env) => env.CONTENT.get("content", { type: "json" });
const isSecure = (request) => new URL(request.url).protocol === "https:";

async function enabledAdmins(env) {
  return (await A.listUsers(env)).filter((u) => !u.disabled);
}

// ---- Router ---------------------------------------------------------------------------

export async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/admin\/?/, "");
  const method = request.method;

  if (!env.CONTENT) return json({ ok: false, error: "storage_not_configured" }, 503);

  // Every state-changing call must be a same-origin request carrying our header (CSRF guard for cookie auth).
  const mutating = method === "PUT" || method === "POST" || method === "DELETE" || method === "PATCH";
  if (mutating && request.headers.get("X-Admin-Request") !== "1") return json({ ok: false, error: "csrf" }, 403);

  // -- Sign in (no session yet)
  if (route === "auth/login" && method === "POST") {
    const { body, error } = await readJson(request, 10_000);
    if (error) return error;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const result = await A.login(env, body.identifier, body.password, ip);
    if (result.error) return json({ ok: false, error: result.error }, result.status);
    return json(
      { ok: true, user: A.publicUser(result.user), mustChange: result.user.mustChange },
      200,
      { "Set-Cookie": A.sessionCookie(result.cookie, isSecure(request)) }
    );
  }

  const principal = await authenticate(request, env);

  if (route === "session" && method === "GET") {
    if (!principal) return json({ ok: false, error: "unauthorized" }, 401);
    return json({ ok: true, who: principal.who, user: principal.user ? A.publicUser(principal.user) : null, superuser: Boolean(principal.superuser), mustChange: Boolean(principal.user?.mustChange), storage: true });
  }
  if (!principal) return json({ ok: false, error: "unauthorized" }, 401);

  if (route === "auth/logout" && method === "POST") {
    if (principal.cookie) await A.destroySession(env, principal.cookie);
    return json({ ok: true }, 200, { "Set-Cookie": A.sessionCookie("", isSecure(request), 0) });
  }

  if (route === "auth/change-password" && method === "POST") {
    if (!principal.user) return json({ ok: false, error: "not_a_user" }, 400);
    const { body, error } = await readJson(request, 10_000);
    if (error) return error;
    const user = principal.user;
    if (!(await A.checkPassword(String(body.current || ""), user))) return json({ ok: false, error: "wrong_password", message: "Current password is incorrect." }, 403);
    const problem = A.passwordProblem(body.next, { id: user.id, email: user.email, current: String(body.current) });
    if (problem) return json({ ok: false, error: "weak_password", message: problem }, 422);
    await A.setPassword(env, user, String(body.next), false);
    // setPassword signs every session out; keep this one by minting a fresh session.
    const token = await A.createSession(env, user.id);
    return json({ ok: true }, 200, { "Set-Cookie": A.sessionCookie(A.cookieValue(user.id, token), isSecure(request)) });
  }

  // Everything below needs a finished password change.
  if (principal.user?.mustChange) return json({ ok: false, error: "password_change_required" }, 403);

  // -- Admin users
  if (route === "users" || route.startsWith("users/")) return handleUsers(request, env, route, method, principal);

  // -- Content
  if (route === "content" && method === "GET") {
    const env_ = await readEnvelope(env);
    return json({
      ok: true,
      source: env_ ? "saved" : "defaults",
      updatedAt: env_?.updatedAt || null,
      updatedBy: env_?.updatedBy || null,
      content: env_ ? env_.data : defaultContent(),
      defaults: defaultContent(),
    });
  }

  if (route === "content" && method === "PUT") {
    const { body, error } = await readJson(request);
    if (error) return error;
    const content = body && body.content;
    const problems = validateContent(content);
    if (problems.length) return json({ ok: false, error: "invalid", problems }, 422);
    try {
      renderContent(content); // real render check: the site must build from this content
    } catch (err) {
      return json({ ok: false, error: "render_failed", problems: [String(err && err.message ? err.message : err)] }, 422);
    }
    const updatedAt = new Date().toISOString();
    const envelope = { updatedAt, updatedBy: principal.who, data: content };
    await env.CONTENT.put(`history:${updatedAt}`, JSON.stringify(envelope), { expirationTtl: HISTORY_TTL, metadata: { by: principal.who, at: updatedAt } });
    await env.CONTENT.put("content", JSON.stringify(envelope));
    return json({ ok: true, updatedAt, updatedBy: principal.who });
  }

  if (route === "reset" && method === "POST") {
    const prev = await readEnvelope(env);
    const at = new Date().toISOString();
    if (prev) await env.CONTENT.put(`history:${at}`, JSON.stringify({ ...prev, resetBy: principal.who }), { expirationTtl: HISTORY_TTL, metadata: { by: principal.who, at, reset: true } });
    await env.CONTENT.delete("content");
    return json({ ok: true });
  }

  if (route === "history" && method === "GET") {
    const list = await env.CONTENT.list({ prefix: "history:", limit: 50 });
    const items = list.keys.map((k) => ({ id: k.name.slice("history:".length), by: k.metadata?.by || "", reset: Boolean(k.metadata?.reset) })).reverse();
    return json({ ok: true, items });
  }

  const hist = /^history\/(.+)$/.exec(route);
  if (hist && method === "GET") {
    const env_ = await env.CONTENT.get(`history:${decodeURIComponent(hist[1])}`, { type: "json" });
    if (!env_) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, content: env_.data });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

// ---- Users ----------------------------------------------------------------------------

async function handleUsers(request, env, route, method, principal) {
  const me = principal.user;

  if (route === "users" && method === "GET") {
    return json({ ok: true, users: (await A.listUsers(env)).map(A.publicUser), me: me ? me.id : null });
  }

  if (route === "users" && method === "POST") {
    const { body, error } = await readJson(request, 10_000);
    if (error) return error;
    const email = A.normalizeId(body.email);
    if (!/^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/.test(email) || !A.validId(email)) return json({ ok: false, error: "bad_email", message: "Enter a valid email address." }, 422);
    if (await A.getUser(env, email)) return json({ ok: false, error: "exists", message: "An admin with that email already exists." }, 409);
    const temp = A.tempPassword();
    const user = await A.createUser(env, { id: email, email, name: String(body.name || "").trim().slice(0, 80), password: temp, mustChange: true, createdBy: principal.who });
    return json({ ok: true, user: A.publicUser(user), tempPassword: temp }, 201);
  }

  const m = /^users\/(.+)$/.exec(route);
  if (!m) return json({ ok: false, error: "not_found" }, 404);
  const id = A.normalizeId(decodeURIComponent(m[1]).replace(/\/reset-password$/, ""));
  const isReset = route.endsWith("/reset-password");
  const target = await A.getUser(env, id);
  if (!target) return json({ ok: false, error: "not_found" }, 404);
  const isSelf = me && me.id === target.id;

  if (isReset && method === "POST") {
    if (isSelf) return json({ ok: false, error: "use_change_password", message: "Use “Change password” for your own account." }, 400);
    const temp = A.tempPassword();
    await A.setPassword(env, target, temp, true);
    await A.clearFailures(env, target.id);
    return json({ ok: true, tempPassword: temp });
  }

  if (method === "PATCH") {
    const { body, error } = await readJson(request, 10_000);
    if (error) return error;
    const patch = {};
    if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 80);
    if (typeof body.disabled === "boolean") {
      if (body.disabled && isSelf) return json({ ok: false, error: "self", message: "You can't disable your own account." }, 400);
      if (body.disabled && !target.disabled && (await enabledAdmins(env)).filter((u) => u.id !== target.id).length === 0)
        return json({ ok: false, error: "last_admin", message: "At least one admin must stay enabled." }, 400);
      patch.disabled = body.disabled;
    }
    await A.updateUser(env, target, patch);
    if (patch.disabled) await A.revokeSessions(env, target.id);
    return json({ ok: true, user: A.publicUser({ ...target, ...patch }) });
  }

  if (method === "DELETE") {
    if (isSelf) return json({ ok: false, error: "self", message: "You can't delete your own account." }, 400);
    if (!target.disabled && (await enabledAdmins(env)).filter((u) => u.id !== target.id).length === 0)
      return json({ ok: false, error: "last_admin", message: "At least one admin must stay enabled." }, 400);
    await A.removeUser(env, target.id);
    return json({ ok: true });
  }

  return json({ ok: false, error: "not_found" }, 404);
}
