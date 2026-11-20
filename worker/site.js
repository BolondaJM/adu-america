// Serves admin-edited content. When an admin has saved changes (stored in KV under "content"),
// pages are rendered here with the same code the build uses. With no saved changes, this does
// nothing and the pre-built static pages are served untouched.
import { applyContent } from "../scripts/store.mjs";
import { renderAll } from "../scripts/render.mjs";
import { applyIncludes, headHtml, headerHtml, footerHtml, leadFormHtml } from "../scripts/partials.mjs";

const TYPES = {
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

// Paths that exist as static HTML but are not generated pages.
const STATIC_HTML = new Set(["/", "/admin", "/admin/"]);

let memo = { key: null, out: null };
let assetMemo = null;

export function renderContent(content, key = null) {
  if (key && memo.key === key && memo.out) return memo.out;
  applyContent(content); // synchronous: nothing below awaits
  const { files } = renderAll();
  const html = new Map();
  const text = new Map();
  for (const [rel, body] of files) {
    if (rel.endsWith(".html")) html.set("/" + rel.replace(/index\.html$/, ""), applyIncludes(body));
    else text.set("/" + rel.replace(/^public\//, ""), body);
  }
  const partials = { head: headHtml(), header: headerHtml(), footer: footerHtml(), leadform: leadFormHtml() };
  const out = { html, text, partials };
  if (key) memo = { key, out };
  return out;
}

// Vite fingerprints the CSS/JS bundle names, so read them from the built home page.
const TAGS = /<script type="module"[^>]*src="\/assets\/[^"]+"[^>]*><\/script>|<link rel="(?:stylesheet|modulepreload)"[^>]*href="\/assets\/[^"]+"[^>]*>/g;

async function assetTags(env, request) {
  if (assetMemo) return assetMemo;
  const res = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
  const home = await res.text();
  const tags = home.match(TAGS) || [];
  if (tags.length) assetMemo = tags.join("\n    ");
  return tags.join("\n    ");
}

const withAssets = (html, tags) =>
  html.replace(/<script type="module" src="\/main\.js"><\/script>/, () => "").replace("</head>", () => `    ${tags}\n  </head>`);

async function loadOverride(env) {
  if (!env.CONTENT) return null;
  try {
    const env_ = await env.CONTENT.get("content", { type: "json", cacheTtl: 30 });
    return env_ && env_.data ? env_ : null;
  } catch {
    return null;
  }
}

const htmlResponse = (body, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } });

// Returns { res, active }. `res` is set when this module answered the request.
export async function serveSite(request, env) {
  const method = request.method;
  if (method !== "GET" && method !== "HEAD") return { res: null, active: false };
  const override = await loadOverride(env);
  if (!override) return { res: null, active: false };

  const url = new URL(request.url);
  const p = url.pathname;
  const rendered = renderContent(override.data, override.updatedAt || "v");

  if (rendered.text.has(p)) {
    const ext = p.slice(p.lastIndexOf("."));
    return { active: true, res: new Response(rendered.text.get(p), { headers: { "Content-Type": TYPES[ext] || "text/plain", "Cache-Control": "public, max-age=300" } }) };
  }

  // Home is hand-written and pre-built: swap fresh shared parts into it.
  if (p === "/") {
    // Drop conditional headers: a 304 for the static copy would keep browsers on the stale page.
    const headers = new Headers(request.headers);
    for (const h of ["If-None-Match", "If-Modified-Since", "Range"]) headers.delete(h);
    const res = await env.ASSETS.fetch(new Request(request.url, { method: "GET", headers }));
    if (!res.ok) return { res, active: true };
    let body = await res.text();
    for (const [name, html] of Object.entries(rendered.partials)) {
      body = body.replace(new RegExp(`<!--inc:${name}-->[\\s\\S]*?<!--/inc:${name}-->`), () => `<!--inc:${name}-->${html}<!--/inc:${name}-->`);
    }
    return { active: true, res: htmlResponse(body) };
  }

  const key = p.endsWith("/") ? p : p + "/";
  if (rendered.html.has(key) && key !== "/404.html/") {
    if (key !== p) return { active: true, res: Response.redirect(url.origin + key + url.search, 308) };
    return { active: true, res: htmlResponse(withAssets(rendered.html.get(key), await assetTags(env, request))) };
  }
  if (p === "/404.html") return { active: true, res: await notFound(rendered, env, request) };
  return { active: true, res: null, rendered };
}

export async function notFound(rendered, env, request) {
  const html = rendered.html.get("/404.html");
  if (!html) return new Response("Not found", { status: 404 });
  return htmlResponse(withAssets(html, await assetTags(env, request)), 404);
}

// After the static asset lookup: block pages that were deleted in the admin but still exist in the build.
export async function guardStale(res, request, env, state) {
  if (!state.active || res.status !== 200) return res;
  if (!(res.headers.get("Content-Type") || "").includes("text/html")) return res;
  const p = new URL(request.url).pathname;
  if (STATIC_HTML.has(p) || p.startsWith("/admin")) return res;
  return notFound(state.rendered || (await renderForGuard(env)), env, request);
}

async function renderForGuard(env) {
  const override = await loadOverride(env);
  return renderContent(override.data, override.updatedAt || "v");
}
