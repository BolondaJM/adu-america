// Cloudflare Worker: serves static assets and handles POST /api/lead.
//
// Configure (wrangler secret put <NAME>):
//   RESEND_API_KEY     Email delivery via Resend (https://resend.com)
//   LEAD_FROM_EMAIL    Verified sender, e.g. "ADU America <leads@adu-america.com>"
//   LEAD_TO_EMAIL      Where leads go (default admin@adu-america.com)
//   LEAD_WEBHOOK_URL   Optional: also POST each lead as JSON (CRM, Zapier, Make...)
//   TURNSTILE_SECRET   Optional: Cloudflare Turnstile secret key
// At least one of RESEND_API_KEY or LEAD_WEBHOOK_URL is required, otherwise the API
// answers 503 so the site never reports a lead as sent when it was not.

const REQUIRED = {
  lead: ["name", "phone", "email", "city", "project"],
  newsletter: ["email"],
  "spec-sheet": ["email"],
  chat: ["name", "message"],
  estimate: ["email"],
  career: ["name", "email"],
  partner: ["company", "name", "email"],
  referral: ["name", "email", "friend_name", "friend_phone"],
};

const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_FILE = /^(application\/pdf|image\/(png|jpe?g|webp|heic))$/i;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      try {
        return await handleLead(request, env);
      } catch (err) {
        console.error("lead error", err);
        return json({ ok: false, error: "server_error" }, 500);
      }
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
  },
};

export async function handleLead(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  if ((form.get("_honey") || "").toString().trim()) return json({ ok: true }); // bot: pretend success

  const type = (form.get("_type") || "lead").toString();
  const required = REQUIRED[type];
  if (!required) return json({ ok: false, error: "unknown_type" }, 400);

  const data = {};
  const files = [];
  for (const [key, value] of form.entries()) {
    if (key === "_honey" || key === "cf-turnstile-response") continue;
    if (typeof value === "string") data[key] = value.trim().slice(0, 4000);
    else if (value && value.size > 0) files.push(value);
  }

  for (const key of required) if (!data[key]) return json({ ok: false, error: "missing_" + key }, 400);
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return json({ ok: false, error: "bad_email" }, 400);
  if (data.phone && data.phone.replace(/\D/g, "").length < 10) return json({ ok: false, error: "bad_phone" }, 400);

  if (!env.RESEND_API_KEY && !env.LEAD_WEBHOOK_URL) return json({ ok: false, error: "not_configured" }, 503);

  if (env.TURNSTILE_SECRET) {
    const token = (form.get("cf-turnstile-response") || "").toString();
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    if (!out.success) return json({ ok: false, error: "captcha_failed" }, 400);
  }

  if (files.length > MAX_FILES) return json({ ok: false, error: "too_many_files" }, 400);
  const attachments = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return json({ ok: false, error: "file_too_large" }, 400);
    if (!ALLOWED_FILE.test(f.type)) return json({ ok: false, error: "file_type" }, 400);
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    attachments.push({ filename: (f.name || "upload").slice(0, 100), content: btoa(bin) });
  }

  const subject = {
    lead: "Free property analysis — ADU America website",
    newsletter: "Newsletter signup",
    "spec-sheet": `Spec sheet request: ${data.model || ""}`,
    chat: "Website chat message",
    estimate: "Cost estimate requested",
    career: "Careers inquiry",
    partner: "Partner inquiry",
    referral: "Referral",
  }[type];

  const lead = { type, subject, receivedAt: new Date().toISOString(), ...data, fileCount: files.length };
  const tasks = [];

  if (env.LEAD_WEBHOOK_URL) {
    tasks.push(
      fetch(env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }).then((r) => {
        if (!r.ok) throw new Error("webhook " + r.status);
      })
    );
  }

  if (env.RESEND_API_KEY) {
    const from = env.LEAD_FROM_EMAIL || "ADU America <onboarding@resend.dev>";
    const to = env.LEAD_TO_EMAIL || "admin@adu-america.com";
    const rows = Object.entries(data)
      .map(([k, v]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join("");
    const send = (payload) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("resend " + r.status);
      });
    tasks.push(send({ from, to: [to], reply_to: data.email || undefined, subject, html: `<table>${rows}</table>`, attachments: attachments.length ? attachments : undefined }));
  }

  // Delivery must succeed on at least one channel for the lead to count.
  const results = await Promise.allSettled(tasks);
  if (!results.some((r) => r.status === "fulfilled")) {
    console.error("all delivery channels failed", results.map((r) => r.reason?.message));
    return json({ ok: false, error: "delivery_failed" }, 502);
  }

  // Confirmation email to the lead (best effort).
  if (env.RESEND_API_KEY && data.email && ["lead", "spec-sheet", "estimate"].includes(type)) {
    const from = env.LEAD_FROM_EMAIL || "ADU America <onboarding@resend.dev>";
    const body =
      type === "lead"
        ? "<p>Thanks for reaching out to ADU America. We received your request for a free property analysis and will follow up shortly.</p><p>Need us sooner? Call (720) 544-1352.</p>"
        : "<p>Thanks for your interest in ADU America. A member of our team will follow up with the details you asked for.</p>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [data.email], subject: "We received your request — ADU America", html: body }),
    }).catch(() => {});
  }

  return json({ ok: true });
}
