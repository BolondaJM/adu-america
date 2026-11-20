// Shared HTML fragments. Used by the Vite include plugin (vite.config.js) and by
// scripts/generate.mjs. Pages reference them with comment markers:
//   <!--@head-->  <!--@header-->  <!--@header:minimal-->  <!--@footer-->  <!--@footer:minimal-->  <!--@leadform-->
import { site, getNav, projectTypes, cityOptions, markets } from "../site.config.mjs";

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const logoSvg = `<svg viewBox="0 0 140 128" aria-hidden="true"><path fill="#b87332" d="M8 124h9V42L69 11 60 6 8 37Z" /><path fill="currentColor" fill-rule="evenodd" d="M28 124V49L81 17l54 31v6h-13v70H75V89H37v35ZM37 53l35-19 3 45H37Z" /></svg>`;

export function head() {
  const cfg = {
    ga4: site.analytics.ga4,
    metaPixel: site.analytics.metaPixel,
    plausible: site.analytics.plausible,
    turnstile: site.turnstileSiteKey,
    calendar: site.calendarUrl,
    phone: site.phone,
    phoneTel: site.phoneTel,
  };
  return `<link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <script>window.__SITE__=${JSON.stringify(cfg).split("<").join("\\u003c")};</script>`;
}

const chevron = `<svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;
const searchIcon = `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;

export function header(variant) {
  const logo = `<a class="logo" href="/" aria-label="${site.name}, home">${logoSvg}<span>${site.name}</span></a>`;
  if (variant === "minimal") {
    return `<header class="nav is-solid">
      ${logo}
      <div class="nav__minimal">
        <a class="nav__phone" href="tel:${site.phoneTel}" data-track="phone_click">${site.phone}</a>
        <a class="btn btn--light" href="#consult">Free analysis</a>
      </div>
    </header>`;
  }
  const items = getNav()
    .map((item) => {
      const subs = (item.children || [])
        .map(([label, href]) => `<a href="${href}">${esc(label)}</a>`)
        .join("");
      if (!item.children) return `<a href="${item.href}">${esc(item.label)}</a>`;
      const label = item.href
        ? `<a href="${item.href}">${esc(item.label)}</a><button class="nav__sub-toggle" type="button" aria-expanded="false" aria-label="${esc(item.label)} submenu">${chevron}</button>`
        : `<button class="nav__group-label" type="button" aria-expanded="false">${esc(item.label)} ${chevron}</button>`;
      return `<div class="nav__group">${label}<div class="nav__sub">${subs}</div></div>`;
    })
    .join("\n        ");
  return `<header class="nav" id="nav">
      ${logo}
      <button class="nav__toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu">
        <span class="sr-only">Menu</span>
        <i></i><i></i>
      </button>
      <nav class="nav__menu" id="nav-menu" aria-label="Primary">
        ${items}
        <button class="nav__search" id="nav-search" type="button" aria-label="Search the site">${searchIcon}</button>
        <a class="nav__phone" href="tel:${site.phoneTel}" data-track="phone_click">${site.phone}</a>
        <a class="btn btn--light" href="/book/">Free analysis</a>
      </nav>
    </header>`;
}

const socialLabels = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", google: "Google Business Profile" };

export function footer(variant) {
  if (variant === "minimal") {
    return `<footer class="footer footer--min"><div class="wrap footer__base">
      <small>© ${new Date().getFullYear()} ${site.name}</small>
      <small><a href="tel:${site.phoneTel}">${site.phone}</a></small>
      <small><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></small>
    </div></footer>`;
  }
  const addr = site.address
    ? `<p>${esc(site.address.street)}<br />${esc(site.address.city)}, ${esc(site.address.state)} ${esc(site.address.zip)}</p>`
    : "";
  const hours = site.hours ? `<p>${esc(site.hours)}</p>` : "";
  const lic = [site.license, site.insurance].filter(Boolean).map((t) => `<p class="footer__badge">${esc(t)}</p>`).join("");
  const socials = Object.entries(site.socials)
    .filter(([, url]) => url)
    .map(([k, url]) => `<a href="${esc(url)}" rel="noopener" target="_blank">${socialLabels[k]}</a>`)
    .join("");
  const list = (arr) => arr.map(([l, h]) => `<li><a href="${h}">${esc(l)}</a></li>`).join("");
  return `<footer class="footer">
      <div class="wrap footer__grid">
        <div>
          <p class="logo logo--footer">${logoSvg}${site.name}</p>
          <p>Stick-built tiny homes, ADUs, and pool houses.</p>
          <address>
            <a href="tel:${site.phoneTel}" data-track="phone_click">${site.phone}</a>
            <a href="mailto:${site.email}">${site.email}</a>
          </address>
          ${addr}${hours}${lic}
          ${socials ? `<p class="footer__social">${socials}</p>` : ""}
        </div>
        <nav aria-label="Explore">
          <h2 class="footer__h">Explore</h2>
          <ul>${list([["Models", "/models/"], ["Services", "/services/"], ["Projects", "/projects/"], ["Pricing", "/pricing/"], ["Financing", "/financing/"], ["Free tools", "/tools/"], ["Book a consultation", "/book/"]])}</ul>
        </nav>
        <nav aria-label="Company">
          <h2 class="footer__h">Company</h2>
          <ul>${list([["About", "/about/"], ["Process", "/process/"], ["Reviews", "/reviews/"], ["Resources", "/resources/"], ["FAQ", "/faq/"], ["Contact", "/contact/"], ["Careers", "/careers/"], ["Partners", "/partners/"], ["Referrals", "/referral/"]])}</ul>
        </nav>
        <div>
          <h2 class="footer__h">Service areas</h2>
          <ul>${list(markets.map((m) => [m.name, `/locations/${m.slug}/`]))}</ul>
          <form class="newsletter" data-api-form data-form-type="newsletter" novalidate>
            <label for="nl-email" class="footer__h">Occasional ADU tips</label>
            <p class="form-error" role="alert" hidden></p>
            <div class="newsletter__row">
              <input id="nl-email" name="email" type="email" autocomplete="email" placeholder="Email address" required />
              <button class="btn btn--light" type="submit">Join</button>
            </div>
            <small class="err"></small>
            <label class="hp" aria-hidden="true">Company website<input type="text" name="_honey" tabindex="-1" autocomplete="off" /></label>
            <p class="fine fine--light" data-success hidden>Thanks, you're on the list.</p>
          </form>
        </div>
      </div>
      <div class="wrap footer__base">
        <small>© ${new Date().getFullYear()} ${site.name}</small>
        <small><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/warranty/">Warranty</a> · <a href="/accessibility/">Accessibility</a></small>
        <small>Images on this site are design studies of the homes we build, not photos of a specific client project.</small>
      </div>
    </footer>
    <div class="dock">
      <a href="tel:${site.phoneTel}" data-track="phone_click">Call</a>
      <a href="/book/">Free analysis</a>
    </div>`;
}

// ---- Forms -------------------------------------------------------------

function control(id, f) {
  const req = f.required ? " required" : "";
  const ac = f.autocomplete ? ` autocomplete="${f.autocomplete}"` : "";
  if (f.type === "select") {
    const opts = f.options.map((o) => `<option>${esc(o)}</option>`).join("");
    return `<span class="select"><select id="${id}" name="${f.name}"${req}><option value="">Select one</option>${opts}</select></span>`;
  }
  if (f.type === "textarea") return `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${req}></textarea>`;
  if (f.type === "file")
    return `<input id="${id}" name="${f.name}" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.heic" />`;
  const list = f.list ? ` list="${id}-list"` : "";
  const dl = f.list ? `<datalist id="${id}-list">${f.list.map((o) => `<option value="${esc(o)}"></option>`).join("")}</datalist>` : "";
  const im = f.type === "tel" ? ' inputmode="tel"' : "";
  return `<input id="${id}" name="${f.name}" type="${f.type || "text"}"${im}${ac}${list}${req} />${dl}`;
}

export function fieldHtml(prefix, f) {
  const id = `${prefix}-${f.name}`;
  return `<label class="field${f.wide ? " field--wide" : ""}" for="${id}"><span>${esc(f.label)}</span>${control(id, f)}<small class="err"></small></label>`;
}

export function apiForm({ id, type, title, lead, fields, submit, note, redirect, success, hidden = {} }) {
  const rows = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    const next = fields[i + 1];
    if (!f.wide && next && !next.wide) {
      rows.push(`<div class="field-row">${fieldHtml(id, f)}${fieldHtml(id, next)}</div>`);
      i += 2;
    } else {
      rows.push(fieldHtml(id, f));
      i += 1;
    }
  }
  const hid = Object.entries(hidden)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}" />`)
    .join("");
  const turnstile = site.turnstileSiteKey
    ? `<div class="cf-turnstile" data-sitekey="${esc(site.turnstileSiteKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`
    : "";
  return `<form id="${id}" data-api-form data-form-type="${type}"${redirect ? ` data-redirect="${redirect}"` : ""} novalidate>
            ${title ? `<h3>${esc(title)}</h3>` : ""}
            ${lead ? `<p class="form-lead">${esc(lead)}</p>` : ""}
            <p class="form-error" role="alert" hidden></p>
            ${rows.join("\n            ")}
            ${hid}
            <label class="hp" aria-hidden="true">Company website<input type="text" name="_honey" tabindex="-1" autocomplete="off" /></label>
            ${turnstile}
            <button class="btn btn--dark" type="submit">${esc(submit)}</button>
            ${note ? `<p class="fine">${esc(note)}</p>` : ""}
          </form>
          <div class="success" data-success hidden>
            <p class="eyebrow">You’re in</p>
            <h3>${esc(success || "Request received.")}</h3>
            <a class="btn btn--dark" href="tel:${site.phoneTel}">Call ${site.phone}</a>
          </div>`;
}

export function leadForm({ extended = false, id = "lead-form" } = {}) {
  const fields = [
    { name: "name", label: "Name", autocomplete: "name", required: true },
    { name: "phone", label: "Phone", type: "tel", autocomplete: "tel", required: true },
    { name: "email", label: "Email", type: "email", autocomplete: "email", required: true },
    { name: "city", label: "City", autocomplete: "address-level2", list: cityOptions, required: true },
    { name: "project", label: "What do you want to build?", type: "select", options: projectTypes, required: true, wide: true },
  ];
  if (extended) {
    fields.push(
      { name: "address", label: "Property address (optional)", autocomplete: "street-address", wide: true },
      { name: "budget", label: "Budget range (optional)", type: "select", options: ["Under $100k", "$100k–$150k", "$150k–$200k", "$200k–$300k", "$300k+", "Not sure yet"] },
      { name: "timeline", label: "When to start (optional)", type: "select", options: ["As soon as possible", "Within 3 months", "3–6 months", "6–12 months", "Just exploring"] },
      { name: "preferred_date", label: "Preferred date for the analysis (optional)", type: "date" },
      { name: "preferred_time", label: "Preferred time (optional)", type: "select", options: ["Morning", "Midday", "Afternoon", "Evening"] },
      { name: "ownership", label: "Do you own the property?", type: "select", options: ["I own it", "I'm buying it", "I rent it"], wide: true },
      { name: "files", label: "Plot plan or photos (optional, up to 3 files, 4 MB each)", type: "file", wide: true }
    );
  }
  fields.push({ name: "notes", label: "Anything we should know? Optional.", type: "textarea", wide: true });
  return apiForm({
    id,
    type: "lead",
    title: "Free property analysis",
    lead: "Name, a way to reach you, the city, and what you are thinking of building.",
    fields,
    submit: "Request my property analysis",
    note: "We use this to schedule the analysis. No newsletter. See our privacy policy.",
    redirect: "/thank-you/?t=lead",
  });
}

// ---- Include plugin helper -------------------------------------------------

// Each include is wrapped in marker comments so the edge Worker can swap a fresh copy into
// the pre-built home page (see worker/site.js).
const inc = (name, html) => `<!--inc:${name}-->${html}<!--/inc:${name}-->`;

export function applyIncludes(html) {
  const swap = (marker, name, build) => (h) => h.includes(marker) ? h.replace(marker, () => inc(name, build())) : h;
  return [
    swap("<!--@head-->", "head", head),
    swap("<!--@header:minimal-->", "header", () => header("minimal")),
    swap("<!--@header-->", "header", () => header()),
    swap("<!--@footer:minimal-->", "footer", () => footer("minimal")),
    swap("<!--@footer-->", "footer", () => footer()),
    swap("<!--@leadform:extended-->", "leadform", () => leadForm({ extended: true })),
    swap("<!--@leadform-->", "leadform", () => leadForm()),
  ].reduce((h, fn) => fn(h), html);
}

export { head as headHtml, header as headerHtml, footer as footerHtml, leadForm as leadFormHtml };
