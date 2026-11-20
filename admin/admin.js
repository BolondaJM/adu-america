import "./admin.css";
import { imageKeys, img } from "../site.config.mjs";

/* ---------------- Section schema ----------------
   kind "object": edits the object at `path`.
   kind "list":   edits the array of objects at `path` (add / remove / reorder).
   kind "strings": edits a plain string array, one per line.
   Field `type`: text | area | html | number | lines | paras | range | image | select | check
   `idx` reads a tuple position instead of a key (FAQ pairs are [question, answer]). */

const slugify = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SECTIONS = [
  { group: "Business" },
  {
    id: "site", label: "Business & contact", kind: "object", path: "site",
    lead: "Shown in the header, footer, contact page and search results.",
    fields: [
      { k: "name", label: "Business name" },
      { k: "founder", label: "Founder / president" },
      { k: "phone", label: "Phone (display)", hint: "e.g. (720) 544-1352" },
      { k: "phoneTel", label: "Phone (dial format)", hint: "e.g. +17205441352" },
      { k: "email", label: "Email" },
      { k: "url", label: "Website URL", hint: "Used for canonical links and the sitemap, no trailing slash" },
      { k: "hours", label: "Business hours", hint: "Optional" },
      { k: "license", label: "License number", hint: "Optional. Shown in the footer" },
      { k: "insurance", label: "Insurance statement", hint: "Optional" },
      { k: "address.street", label: "Street address", hint: "Optional. Leave all address fields empty to hide" },
      { k: "address.city", label: "City" },
      { k: "address.state", label: "State" },
      { k: "address.zip", label: "ZIP" },
    ],
  },
  {
    id: "integrations", label: "Integrations", kind: "object", path: "site",
    lead: "Analytics load only after a visitor accepts cookies (Plausible needs no consent). Empty = off.",
    fields: [
      { k: "analytics.ga4", label: "Google Analytics 4 ID", hint: "G-XXXXXXXXXX" },
      { k: "analytics.metaPixel", label: "Meta Pixel ID" },
      { k: "analytics.plausible", label: "Plausible domain", hint: "e.g. adu-america.com" },
      { k: "turnstileSiteKey", label: "Cloudflare Turnstile site key", hint: "Public key only. The secret lives in Worker secrets" },
      { k: "calendarUrl", label: "Booking calendar URL", hint: "Calendly or Cal.com. Embedded on /book/" },
      { k: "reviewUrl", label: "“Leave a review” link", hint: "Google or Yelp review URL" },
      { k: "socials.facebook", label: "Facebook URL" },
      { k: "socials.instagram", label: "Instagram URL" },
      { k: "socials.youtube", label: "YouTube URL" },
      { k: "socials.linkedin", label: "LinkedIn URL" },
      { k: "socials.google", label: "Google Business Profile URL" },
    ],
  },
  { group: "Catalog" },
  {
    id: "models", label: "Models", kind: "list", path: "models", itemLabel: "model", title: "name", url: (i) => `/models/${i.slug}/`,
    lead: "Each model gets its own page, a floor plan, a spec sheet request, and a row in the comparison table.",
    blank: () => ({ slug: "", name: "", project: "", index: "", image: "hero", sqft: [500, 650], beds: "1", baths: "1", summary: "", bestFor: [] }),
    fields: [
      { k: "name", label: "Name", wide: false },
      { k: "slug", label: "URL slug", hint: "Page address: /models/<slug>/. Changing it breaks old links" },
      { k: "project", label: "Form option name", hint: "Pre-selects the project in the lead form" },
      { k: "index", label: "Model number", hint: "e.g. 04" },
      { k: "sqft", type: "range", label: "Size range (sq ft)" },
      { k: "beds", label: "Bedrooms" },
      { k: "baths", label: "Bathrooms" },
      { k: "image", type: "image", label: "Image" },
      { k: "alt", label: "Image description (alt text)", hint: "Optional for built-in images", wide: true },
      { k: "summary", type: "area", label: "Summary", wide: true },
      { k: "bestFor", type: "lines", label: "Best for", hint: "One per line", wide: true },
    ],
  },
  {
    id: "services", label: "Services", kind: "list", path: "services", itemLabel: "service", title: "name", url: (i) => `/services/${i.slug}/`,
    blank: () => ({ slug: "", name: "", project: "", image: "hero", blurb: "", body: [] }),
    fields: [
      { k: "name", label: "Name" },
      { k: "slug", label: "URL slug" },
      { k: "project", label: "Form option name" },
      { k: "image", type: "image", label: "Image" },
      { k: "alt", label: "Image description (alt text)", wide: true },
      { k: "blurb", type: "area", label: "Short description", wide: true },
      { k: "body", type: "paras", label: "Page text", hint: "Separate paragraphs with a blank line", wide: true },
    ],
  },
  {
    id: "markets", label: "Locations", kind: "list", path: "markets", itemLabel: "market", title: "name", url: (i) => `/locations/${i.slug}/`,
    lead: "Each location gets a page and an ad landing page at /lp/<slug>/.",
    blank: () => ({ slug: "", name: "", state: "", abbr: "", cities: [], blurb: "" }),
    fields: [
      { k: "name", label: "Market name", hint: "e.g. Denver Metro" },
      { k: "slug", label: "URL slug" },
      { k: "state", label: "State" },
      { k: "abbr", label: "State abbreviation" },
      { k: "cities", type: "lines", label: "Cities served", hint: "One per line", wide: true },
      { k: "blurb", type: "area", label: "Short description", wide: true },
    ],
  },
  {
    id: "projects", label: "Projects", kind: "list", path: "projects", itemLabel: "project", title: "title", url: (i) => `/projects/${i.slug}/`,
    lead: "Gallery items. Use an image path like /images/your-photo.jpg for new photos (add the file to public/images).",
    blank: () => ({ slug: "", title: "", type: "ADU", image: "hero", note: "" }),
    fields: [
      { k: "title", label: "Title" },
      { k: "slug", label: "URL slug" },
      { k: "type", label: "Type", hint: "Used by the gallery filter, e.g. ADU, Tiny home, Pool house" },
      { k: "image", type: "image", label: "Image" },
      { k: "alt", label: "Image description (alt text)", wide: true },
      { k: "note", type: "area", label: "Caption", wide: true },
    ],
  },
  { group: "Pricing & forms" },
  {
    id: "pricing", label: "Pricing", kind: "object", path: "pricing",
    lead: "Drives the pricing page, model ranges, and the cost estimator. Ranges are illustrative, not quotes.",
    fields: [
      { k: "perSqftLow", type: "number", label: "Low price per sq ft ($)" },
      { k: "perSqftHigh", type: "number", label: "High price per sq ft ($)" },
      { k: "shellFactor", type: "number", step: "0.01", label: "Shell cost factor", hint: "0.6 = shell costs 60% of finished" },
      { k: "upgradeUplift.premium", type: "number", step: "0.01", label: "Premium finishes uplift", hint: "0.12 = +12%" },
      { k: "upgradeUplift.attached", type: "number", step: "0.01", label: "Attached build uplift" },
      { k: "upgradeUplift.siteWork", type: "number", step: "0.01", label: "Difficult site uplift" },
    ],
  },
  { id: "projectTypes", label: "Project options", kind: "strings", path: "projectTypes", lead: "The “What do you want to build?” dropdown on every form. One per line." },
  { id: "cityOptions", label: "City suggestions", kind: "strings", path: "cityOptions", lead: "City autocomplete suggestions on the lead form. One per line." },
  { group: "Content" },
  {
    id: "faqs", label: "FAQ", kind: "list", path: "faqs", itemLabel: "question", tuple: true, title: "q",
    lead: "Shown on /faq/ and in search-engine FAQ markup.",
    blank: () => ["", ""],
    fields: [
      { idx: 0, label: "Question", wide: true },
      { idx: 1, type: "area", label: "Answer", wide: true },
    ],
  },
  {
    id: "posts", label: "Guides", kind: "list", path: "posts", itemLabel: "guide", title: "title", url: (i) => `/resources/${i.slug}/`,
    lead: "Blog-style guides under /resources/. The body accepts HTML (<h2>, <ul>, <ol>, <strong>).",
    blank: () => ({ slug: "", title: "", desc: "", date: new Date().toISOString().slice(0, 10), body: [] }),
    fields: [
      { k: "title", label: "Title", wide: true },
      { k: "slug", label: "URL slug" },
      { k: "date", type: "date", label: "Date" },
      { k: "desc", label: "Summary (search results)", wide: true },
      { k: "body", type: "paras", label: "Body", hint: "Blank line between blocks. A block starting with < is raw HTML", wide: true, tall: true },
    ],
  },
  {
    id: "reviews", label: "Reviews", kind: "list", path: "site.reviews", itemLabel: "review", title: "name", url: () => "/reviews/",
    lead: "Only add real, verified reviews. They appear on /reviews/ and feed the star rating in search results.",
    blank: () => ({ name: "", city: "", project: "", rating: 5, text: "" }),
    fields: [
      { k: "name", label: "Reviewer name" },
      { k: "city", label: "City" },
      { k: "project", label: "Project" },
      { k: "rating", type: "number", label: "Rating (1–5)" },
      { k: "text", type: "area", label: "Review", wide: true },
    ],
  },
  { group: "Legal pages" },
  ...["privacy", "terms", "warranty", "accessibility"].map((s) => ({
    id: "legal-" + s, label: s[0].toUpperCase() + s.slice(1), kind: "object", path: "legal." + s, url: `/${s}/`,
    lead: "Template text. Have a lawyer review it before relying on it. The body accepts HTML.",
    fields: [
      { k: "title", label: "Page title" },
      { k: "desc", label: "Summary (search results)" },
      { k: "body", type: "html", label: "Body (HTML)", wide: true },
    ],
  })),
  { group: "Data" },
  { id: "backup", label: "History & backup", kind: "backup" },
  { group: "Admins" },
  { id: "users", label: "Admin users", kind: "users", lead: "Everyone listed here can sign in and edit the whole site, including adding and removing other admins." },
  { id: "account", label: "My account", kind: "account", lead: "Change your own password." },
];

/* ---------------- Helpers ---------------- */

const $app = document.getElementById("app");
const state = { content: null, defaults: null, saved: "", section: "site", who: "", user: null, source: "", updatedAt: "" };

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const getPath = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, path, v) {
  const keys = path.split(".");
  let cur = o;
  keys.slice(0, -1).forEach((k) => {
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  });
  cur[keys.at(-1)] = v;
}

const dirty = () => JSON.stringify(normalize(state.content)) !== state.saved;

// Empty optional values become null so the site hides them.
function normalize(content) {
  const c = JSON.parse(JSON.stringify(content));
  const s = c.site;
  for (const k of ["hours", "license", "insurance"]) if (!String(s[k] ?? "").trim()) s[k] = null;
  const a = s.address;
  if (!a || !Object.values(a).some((v) => String(v ?? "").trim())) s.address = null;
  return c;
}

function toast(msg, kind = "", problems = []) {
  document.querySelector(".toast")?.remove();
  const t = h("div", { class: `toast ${kind}`, role: "status" }, msg, problems.length ? h("ul", {}, problems.map((p) => h("li", {}, p))) : null);
  document.body.append(t);
  setTimeout(() => t.remove(), kind === "bad" ? 9000 : 3500);
}

async function api(path, opts = {}) {
  const headers = { Accept: "application/json", ...(opts.headers || {}) };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (opts.method && opts.method !== "GET") headers["X-Admin-Request"] = "1";
  const res = await fetch(`/api/admin/${path}`, { ...opts, headers, credentials: "same-origin" });
  const type = res.headers.get("Content-Type") || "";
  const data = type.includes("json") ? await res.json() : { ok: false, error: "not_json" };
  return { status: res.status, data };
}

/* ---------------- Field controls ---------------- */

function control(f, item, onChange) {
  const read = () => (f.idx !== undefined ? item[f.idx] : getPath(item, f.k));
  const write = (v) => {
    if (f.idx !== undefined) item[f.idx] = v;
    else setPath(item, f.k, v);
    onChange?.();
  };
  const val = read();
  const type = f.type || "text";
  let input;

  if (type === "area" || type === "html") {
    input = h("textarea", { class: f.tall || type === "html" ? "tall" : "", oninput: (e) => write(e.target.value) });
    input.value = val ?? "";
  } else if (type === "lines") {
    input = h("textarea", { oninput: (e) => write(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)) });
    input.value = (val || []).join("\n");
  } else if (type === "paras") {
    input = h("textarea", { class: f.tall ? "tall" : "", oninput: (e) => write(e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) });
    input.value = (val || []).join("\n\n");
  } else if (type === "range") {
    const [lo, hi] = val || [0, 0];
    const a = h("input", { type: "number", min: "0", value: lo, oninput: () => write([Number(a.value), Number(b.value)]) });
    const b = h("input", { type: "number", min: "0", value: hi, oninput: () => write([Number(a.value), Number(b.value)]) });
    input = h("div", { class: "pair" }, a, b);
  } else if (type === "number") {
    input = h("input", { type: "number", step: f.step || "1", value: val ?? "", oninput: (e) => write(e.target.value === "" ? "" : Number(e.target.value)) });
  } else if (type === "image") {
    const id = "imgs-" + Math.random().toString(36).slice(2);
    const thumb = h("img", { class: "thumb", alt: "" });
    const refresh = () => {
      const src = img(read()).src;
      thumb.src = src;
    };
    input = h("div", {}, h("input", { list: id, value: val ?? "", oninput: (e) => { write(e.target.value.trim()); refresh(); } }), h("datalist", { id }, imageKeys.map((k) => h("option", { value: k }))), thumb);
    refresh();
  } else {
    input = h("input", { type: type === "date" ? "date" : "text", value: val ?? "", oninput: (e) => write(e.target.value) });
  }

  return h("label", { class: `field${f.wide ? " wide" : ""}` }, h("span", {}, f.label), input, f.hint ? h("small", {}, f.hint) : null);
}

/* ---------------- Section renderers ---------------- */

function renderObject(sec, main) {
  const obj = getPath(state.content, sec.path) ?? {};
  if (getPath(state.content, sec.path) == null) setPath(state.content, sec.path, obj);
  main.append(h("div", { class: "panel" }, h("div", { class: "grid" }, sec.fields.map((f) => control(f, obj, refreshStatus)))));
  if (sec.url) main.append(h("p", {}, h("a", { href: sec.url, target: "_blank", rel: "noopener" }, "View live page ↗")));
}

function renderStrings(sec, main) {
  const f = { type: "lines", label: sec.label, wide: true, hint: "One per line" };
  const holder = { v: getPath(state.content, sec.path) || [] };
  const proxy = {
    get v() { return holder.v; },
    set v(x) { holder.v = x; setPath(state.content, sec.path, x); },
  };
  main.append(h("div", { class: "panel" }, control({ ...f, k: "v" }, proxy, refreshStatus)));
}

function renderList(sec, main) {
  const list = getPath(state.content, sec.path);
  const body = h("div");
  const draw = () => {
    body.replaceChildren();
    if (!list.length) body.append(h("div", { class: "empty" }, `No ${sec.itemLabel}s yet.`));
    list.forEach((item, i) => {
      const label = (sec.tuple ? item[0] : item[sec.title]) || `New ${sec.itemLabel}`;
      const move = (d) => {
        const j = i + d;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        refreshStatus();
        draw();
      };
      const titleField = sec.fields.find((f) => (sec.tuple ? f.idx === 0 : f.k === sec.title));
      const fields = sec.fields.map((f) => {
        const el = control(f, item, () => {
          refreshStatus();
          summaryText.textContent = (sec.tuple ? item[0] : item[sec.title]) || `New ${sec.itemLabel}`;
        });
        // Fill an empty slug from the title once the title field loses focus.
        if (f === titleField && sec.fields.some((x) => x.k === "slug")) {
          el.querySelector("input")?.addEventListener("blur", () => {
            if (!item.slug && item[sec.title]) {
              item.slug = slugify(item[sec.title]);
              refreshStatus();
              draw();
            }
          });
        }
        return el;
      });
      const summaryText = h("span", {}, label);
      const del = h("button", { class: "small danger", type: "button", onclick: (e) => { e.preventDefault(); if (confirm(`Delete this ${sec.itemLabel}?`)) { list.splice(i, 1); refreshStatus(); draw(); renderNav(); } } }, "Delete");
      body.append(
        h("details", { class: "card", open: !label || label.startsWith("New ") || undefined },
          h("summary", {}, summaryText, sec.url && item.slug ? h("span", { class: "sub" }, sec.url(item)) : null, h("span", { class: "spacer" }),
            h("button", { class: "small", type: "button", title: "Move up", onclick: (e) => { e.preventDefault(); move(-1); } }, "↑"),
            h("button", { class: "small", type: "button", title: "Move down", onclick: (e) => { e.preventDefault(); move(1); } }, "↓"), del),
          h("div", { class: "body" }, h("div", { class: "grid" }, fields)))
      );
    });
  };
  draw();
  main.append(body, h("div", { class: "row" }, h("button", { class: "primary", type: "button", onclick: () => { list.push(sec.blank()); refreshStatus(); draw(); renderNav(); } }, `+ Add ${sec.itemLabel}`)));
}

function renderBackup(main) {
  const hist = h("ul", { class: "hist" }, h("li", {}, "Loading…"));
  const file = h("input", { type: "file", accept: "application/json", hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      state.content = data.content || data;
      refreshStatus();
      renderMain();
      toast("Imported into the editor. Review it, then Save.", "ok");
    } catch {
      toast("That file isn't valid JSON.", "bad");
    }
  } });
  main.append(
    h("div", { class: "panel" },
      h("p", {}, state.source === "saved" ? `Live content last saved ${new Date(state.updatedAt).toLocaleString()} by ${state.updatedBy || "unknown"}.` : "No saved edits yet: the site is using the built-in defaults."),
      h("div", { class: "row" },
        h("button", { type: "button", onclick: () => {
          const blob = new Blob([JSON.stringify({ content: normalize(state.content) }, null, 2)], { type: "application/json" });
          const a = h("a", { href: URL.createObjectURL(blob), download: `adu-content-${new Date().toISOString().slice(0, 10)}.json` });
          a.click();
        } }, "Export JSON"),
        h("button", { type: "button", onclick: () => file.click() }, "Import JSON"), file,
        h("button", { type: "button", class: "danger", onclick: async () => {
          if (!confirm("Discard ALL saved edits and go back to the built-in defaults? The current version stays in history.")) return;
          const { data } = await api("reset", { method: "POST" });
          if (data.ok) { toast("Reset to defaults.", "ok"); await load(); } else toast("Reset failed.", "bad");
        } }, "Reset to defaults"))),
    h("h2", { style: "margin-top:28px" }, "Version history"),
    h("p", { class: "lead" }, "Every save is kept for 120 days. Load one into the editor, then Save to make it live."),
    h("div", { class: "panel" }, hist)
  );
  api("history").then(({ data }) => {
    hist.replaceChildren();
    if (!data.ok || !data.items.length) return hist.append(h("li", {}, "No saved versions yet."));
    data.items.forEach((it) =>
      hist.append(h("li", {}, h("span", {}, new Date(it.id).toLocaleString()), h("span", { class: "sub" }, it.by), h("span", { class: "spacer", style: "flex:1" }),
        h("button", { class: "small", type: "button", onclick: async () => {
          const r = await api(`history/${encodeURIComponent(it.id)}`);
          if (r.data.ok) { state.content = r.data.content; refreshStatus(); renderMain(); toast("Loaded into the editor. Save to publish it.", "ok"); }
        } }, "Load")))
    );
  });
}

/* ---------------- Admin users & account ---------------- */

function passwordForm({ forced = false, onDone }) {
  const err = h("p", { class: "formerr", role: "alert", hidden: true });
  const cur = h("input", { type: "password", autocomplete: "current-password", required: true });
  const nxt = h("input", { type: "password", autocomplete: "new-password", required: true, minlength: "10" });
  const rep2 = h("input", { type: "password", autocomplete: "new-password", required: true });
  const btn = h("button", { class: "primary", type: "submit" }, forced ? "Set new password" : "Change password");
  return h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        err.hidden = true;
        if (nxt.value !== rep2.value) {
          err.textContent = "The new passwords don't match.";
          err.hidden = false;
          return;
        }
        btn.disabled = true;
        const { data } = await api("auth/change-password", { method: "POST", body: JSON.stringify({ current: cur.value, next: nxt.value }) });
        btn.disabled = false;
        if (data.ok) return onDone();
        err.textContent = data.message || "Couldn't change the password.";
        err.hidden = false;
      },
    },
    err,
    h("label", { class: "field" }, h("span", {}, forced ? "Current (temporary) password" : "Current password"), cur),
    h("label", { class: "field" }, h("span", {}, "New password"), nxt, h("small", {}, "At least 10 characters. Avoid common passwords.")),
    h("label", { class: "field" }, h("span", {}, "Repeat new password"), rep2),
    h("div", { class: "row" }, btn)
  );
}

function renderAccount(main) {
  if (!state.user) return main.append(h("div", { class: "panel" }, "You are signed in with a shared credential (token or Cloudflare Access), which has no password to change here."));
  main.append(
    h(
      "div",
      { class: "panel", style: "max-width:420px" },
      h("p", {}, "Signed in as ", h("strong", {}, state.user.email || state.user.id), "."),
      passwordForm({ onDone: () => { toast("Password changed.", "ok"); renderMain(); } })
    )
  );
}

function renderUsers(main) {
  const list = h("div", {});
  const reveal = h("div", {});
  const showTemp = (who, pw, what) => {
    reveal.replaceChildren(
      h(
        "div",
        { class: "panel notice" },
        h("p", {}, h("strong", {}, what), " for ", who, ". Copy it now. It is shown only once and must be changed at first sign-in."),
        h("p", {}, h("code", { class: "temp" }, pw), " ", h("button", { type: "button", class: "small", onclick: () => navigator.clipboard?.writeText(pw).then(() => toast("Copied.", "ok")) }, "Copy"))
      )
    );
  };
  const draw = async () => {
    const { data } = await api("users");
    list.replaceChildren();
    if (!data.ok) return list.append(h("div", { class: "empty" }, "Couldn't load users."));
    const rows = data.users.map((u) => {
      const self = u.id === data.me;
      const label = u.email || u.id;
      const act = (text, fn, cls = "") => h("button", { class: "small " + cls, type: "button", onclick: fn }, text);
      return h(
        "tr",
        {},
        h("td", {}, h("strong", {}, label), self ? h("span", { class: "tag" }, "you") : null, u.name ? h("div", { class: "sub" }, u.name) : null),
        h("td", {}, u.disabled ? h("span", { class: "tag bad" }, "disabled") : u.mustChange ? h("span", { class: "tag warn" }, "must set password") : h("span", { class: "tag ok" }, "active")),
        h("td", { class: "sub" }, u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"),
        h(
          "td",
          { class: "acts" },
          self
            ? null
            : act("Reset password", async () => {
                if (!confirm(`Reset the password for ${label}? They are signed out and get a temporary password.`)) return;
                const r = await api(`users/${encodeURIComponent(u.id)}/reset-password`, { method: "POST" });
                if (r.data.ok) {
                  showTemp(label, r.data.tempPassword, "New temporary password");
                  draw();
                } else toast(r.data.message || "Failed.", "bad");
              }),
          self
            ? null
            : act(u.disabled ? "Enable" : "Disable", async () => {
                const r = await api(`users/${encodeURIComponent(u.id)}`, { method: "PATCH", body: JSON.stringify({ disabled: !u.disabled }) });
                if (r.data.ok) draw();
                else toast(r.data.message || "Failed.", "bad");
              }),
          self
            ? null
            : act(
                "Delete",
                async () => {
                  if (!confirm(`Delete ${label}? This can't be undone.`)) return;
                  const r = await api(`users/${encodeURIComponent(u.id)}`, { method: "DELETE" });
                  if (r.data.ok) draw();
                  else toast(r.data.message || "Failed.", "bad");
                },
                "danger"
              )
        )
      );
    });
    list.append(
      h(
        "div",
        { class: "panel table-wrap" },
        h(
          "table",
          { class: "users" },
          h("thead", {}, h("tr", {}, h("th", {}, "Admin"), h("th", {}, "Status"), h("th", {}, "Last sign-in"), h("th", {}))),
          h("tbody", {}, rows)
        )
      )
    );
  };

  const email = h("input", { type: "email", required: true, placeholder: "person@example.com", autocomplete: "off" });
  const name = h("input", { type: "text", placeholder: "Optional", autocomplete: "off" });
  const form = h(
    "form",
    {
      class: "panel",
      onsubmit: async (e) => {
        e.preventDefault();
        const r = await api("users", { method: "POST", body: JSON.stringify({ email: email.value, name: name.value }) });
        if (r.data.ok) {
          showTemp(r.data.user.email, r.data.tempPassword, "Temporary password");
          email.value = "";
          name.value = "";
          draw();
        } else toast(r.data.message || "Couldn't add the admin.", "bad");
      },
    },
    h("h3", { style: "margin:0 0 4px" }, "Add an admin"),
    h("p", { class: "lead", style: "margin:0 0 4px" }, "They sign in with their email and the temporary password shown here, then choose their own."),
    h("div", { class: "grid" }, h("label", { class: "field" }, h("span", {}, "Email"), email), h("label", { class: "field" }, h("span", {}, "Name"), name)),
    h("div", { class: "row" }, h("button", { class: "primary", type: "submit" }, "Add admin"))
  );

  main.append(list, reveal, h("div", { style: "height:16px" }), form);
  draw();
}

/* ---------------- Shell ---------------- */

function sectionCount(sec) {
  if (sec.kind === "list") return getPath(state.content, sec.path)?.length ?? 0;
  return "";
}

function renderNav() {
  const side = document.querySelector(".side");
  if (!side) return;
  side.replaceChildren(
    ...SECTIONS.map((s) =>
      s.group
        ? h("h2", {}, s.group)
        : h("button", { type: "button", class: s.id === state.section ? "active" : "", onclick: () => { state.section = s.id; renderNav(); renderMain(); } }, s.label, h("span", { class: "count" }, sectionCount(s)))
    )
  );
}

function renderMain() {
  const main = document.querySelector(".main");
  const sec = SECTIONS.find((s) => s.id === state.section);
  main.replaceChildren(h("h2", {}, sec.label), sec.lead ? h("p", { class: "lead" }, sec.lead) : null);
  if (sec.kind === "object") renderObject(sec, main);
  else if (sec.kind === "strings") renderStrings(sec, main);
  else if (sec.kind === "list") renderList(sec, main);
  else if (sec.kind === "users") renderUsers(main);
  else if (sec.kind === "account") renderAccount(main);
  else renderBackup(main);
  window.scrollTo({ top: 0 });
}

function refreshStatus() {
  const el = document.querySelector(".status");
  const save = document.querySelector("#save");
  if (!el) return;
  const d = dirty();
  el.textContent = d ? "Unsaved changes" : state.source === "saved" ? "All changes live" : "Using defaults";
  el.classList.toggle("dirty", d);
  save.disabled = !d;
}

async function save() {
  const content = normalize(state.content);
  const btn = document.querySelector("#save");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    const { status, data } = await api("content", { method: "PUT", body: JSON.stringify({ content }) });
    if (data.ok) {
      state.saved = JSON.stringify(content);
      state.source = "saved";
      state.updatedAt = data.updatedAt;
      state.updatedBy = data.updatedBy;
      toast("Saved. The site updates within about 30 seconds.", "ok");
    } else if (status === 401) {
      toast("Your session expired. Copy any unsaved text, then reload and sign in again.", "bad");
    } else {
      toast("Couldn't save.", "bad", data.problems || [data.error || "Unknown error"]);
    }
  } catch {
    toast("Couldn't reach the server.", "bad");
  }
  btn.textContent = "Save & publish";
  refreshStatus();
}

function renderApp() {
  $app.replaceChildren(
    h("div", { class: "top" },
      h("h1", {}, "ADU America Admin"),
      h("span", { class: "status" }),
      h("span", { class: "spacer" }),
      h("span", { class: "status" }, state.who),
      h("a", { href: "/", target: "_blank", rel: "noopener" }, "View site ↗"),
      h("button", { class: "small", type: "button", onclick: signOut }, "Sign out"),
      h("button", { id: "save", class: "primary", type: "button", onclick: save }, "Save & publish")),
    h("div", { class: "layout" }, h("nav", { class: "side", "aria-label": "Sections" }), h("main", { class: "main" }))
  );
  // Two .status spans exist (state and user); refreshStatus targets the first.
  document.querySelectorAll(".status")[1].classList.remove("status");
  renderNav();
  renderMain();
  refreshStatus();
}

/* ---------------- Boot ---------------- */

function gate(title, body) {
  $app.replaceChildren(h("div", { class: "gate" }, h("h1", {}, title), body));
}

async function signOut() {
  if (state.content && dirty() && !confirm("You have unsaved changes. Sign out anyway?")) return;
  await api("auth/logout", { method: "POST" });
  state.content = null;
  showLogin();
}

function showLogin() {
  const err = h("p", { class: "formerr", role: "alert", hidden: true });
  const id = h("input", { type: "text", autocomplete: "username", required: true, autofocus: true });
  const pw = h("input", { type: "password", autocomplete: "current-password", required: true });
  const btn = h("button", { class: "primary", type: "submit" }, "Sign in");
  $app.replaceChildren(
    h(
      "div",
      { class: "gate" },
      h("h1", {}, "ADU America Admin"),
      h("p", {}, "Sign in with your email and password."),
      h(
        "form",
        {
          onsubmit: async (e) => {
            e.preventDefault();
            err.hidden = true;
            btn.disabled = true;
            let res;
            try {
              res = await api("auth/login", { method: "POST", body: JSON.stringify({ identifier: id.value, password: pw.value }) });
            } catch {
              btn.disabled = false;
              err.textContent = "Couldn't reach the server.";
              err.hidden = false;
              return;
            }
            btn.disabled = false;
            const { status, data } = res;
            if (data.ok) return boot();
            err.textContent = status === 429 ? "Too many failed attempts. Try again in 15 minutes." : status === 503 ? "Admin storage isn't set up yet." : "Incorrect email or password.";
            err.hidden = false;
            pw.value = "";
          },
        },
        err,
        h("label", { class: "field" }, h("span", {}, "Email"), id),
        h("label", { class: "field" }, h("span", {}, "Password"), pw),
        h("div", { class: "row" }, btn)
      )
    )
  );
}

function showForcedChange() {
  $app.replaceChildren(
    h(
      "div",
      { class: "gate" },
      h("h1", {}, "Choose a new password"),
      h("p", {}, "You're signed in with a temporary or default password. Set your own before continuing."),
      passwordForm({ forced: true, onDone: () => { toast("Password updated.", "ok"); boot(); } })
    )
  );
}

async function load() {
  const { status, data } = await api("content");
  if (!data.ok) throw new Error(`${status} ${data.error}`);
  state.content = data.content;
  state.defaults = data.defaults;
  state.source = data.source;
  state.updatedAt = data.updatedAt;
  state.updatedBy = data.updatedBy;
  state.saved = JSON.stringify(normalize(state.content));
  renderApp();
}

async function boot() {
  let session;
  try {
    session = await api("session");
  } catch {
    return gate("Admin API unavailable", h("p", {}, "The admin needs the Cloudflare Worker. It doesn't run under plain `npm run dev`. Use `npm run cf:dev` or the deployed site."));
  }
  const { status, data } = session;
  if (status === 503) return gate("Storage not set up", h("div", {}, h("p", {}, "The CONTENT KV namespace isn't bound to this Worker."), h("pre", {}, "npx wrangler kv namespace create CONTENT\n# add the returned id to wrangler.jsonc under kv_namespaces, then redeploy")));
  if (status === 401) return showLogin();
  if (!data.ok) return gate("Admin error", h("p", {}, `Unexpected response (${status} ${data.error || ""}).`));
  state.who = data.who;
  state.user = data.user;
  if (data.mustChange) return showForcedChange();
  try {
    await load();
  } catch (err) {
    gate("Couldn't load content", h("p", {}, String(err.message)));
  }
}

window.addEventListener("beforeunload", (e) => {
  if (state.content && dirty()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (state.content && dirty()) save();
  }
});

boot();
