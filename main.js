import "./styles.css";
import "./pages.css";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const cfg = window.__SITE__ || {};
const path = location.pathname;
const isMinimal = document.body.dataset.minimal === "true";
const safe = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};

/* ---------- Nav, scroll progress, seasonal overlay ---------- */
const nav = $("#nav");
const toggle = $("#nav-toggle");
const progress = $("#progress");
const menu = $("#nav-menu");
const halloween = $("#halloween");
const solidAlways = document.body.dataset.solid === "true";

const halloweenShift = () => {
  if (!halloween || halloween.hidden) {
    document.documentElement.style.removeProperty("--halloween-logo-shift");
    return;
  }
  const room = window.innerWidth < 980 ? 92 : Math.min(156, Math.max(104, window.innerWidth * 0.11));
  const shift = Math.max(0, room * (1 - window.scrollY / 88));
  document.documentElement.style.setProperty("--halloween-logo-shift", `${shift}px`);
};

const backTop = document.createElement("button");
const floatCta = document.createElement("a");

const onScroll = () => {
  if (nav) nav.classList.toggle("is-solid", solidAlways || window.scrollY > 12);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  backTop.classList.toggle("is-visible", window.scrollY > 900);
  floatCta.classList.toggle("is-visible", window.scrollY > 700);
  halloweenShift();
};

if (halloween) {
  const now = new Date();
  halloween.hidden = now < new Date(now.getFullYear(), 9, 1) || now >= new Date(now.getFullYear(), 10, 1);
  window.addEventListener("resize", halloweenShift);
}

const setMenu = (open) => {
  if (!nav) return;
  nav.classList.toggle("is-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("nav-lock", open);
};
toggle?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
$$("a", menu || document.createElement("div")).forEach((a) => a.addEventListener("click", () => setMenu(false)));

// Dropdown groups: click/tap/keyboard toggles; hover is handled in CSS.
$$(".nav__sub-toggle, .nav__group-label").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".nav__group");
    const open = !group.classList.contains("is-open");
    $$(".nav__group.is-open").forEach((g) => {
      g.classList.remove("is-open");
      $("[aria-expanded]", g)?.setAttribute("aria-expanded", "false");
    });
    group.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  });
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".nav__group"))
    $$(".nav__group.is-open").forEach((g) => {
      g.classList.remove("is-open");
      $("[aria-expanded]", g)?.setAttribute("aria-expanded", "false");
    });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setMenu(false);
    $$(".nav__group.is-open").forEach((g) => g.classList.remove("is-open"));
  }
});

/* ---------- Preselect project from links or ?project= ---------- */
const setProject = (value) => {
  $$("select[name='project']").forEach((s) => {
    if ([...s.options].some((o) => o.value === value || o.text === value)) s.value = value;
  });
};
$$("[data-choose]").forEach((link) => link.addEventListener("click", () => setProject(link.dataset.choose)));
const qp = new URLSearchParams(location.search);
if (qp.get("project")) setProject(qp.get("project"));
if (qp.get("city")) $$("input[name='city']").forEach((i) => (i.value = qp.get("city")));

/* ---------- FAQ accordions ---------- */
$$(".faq button").forEach((button) => {
  button.addEventListener("click", () => {
    const scope = button.closest(".faq");
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const willOpen = button.getAttribute("aria-expanded") !== "true";
    $$("button", scope).forEach((other) => {
      other.setAttribute("aria-expanded", "false");
      const p = document.getElementById(other.getAttribute("aria-controls"));
      if (p) p.hidden = true;
    });
    if (willOpen) {
      button.setAttribute("aria-expanded", "true");
      panel.hidden = false;
    }
  });
});

/* ---------- Stories scroller (home) ---------- */
const scroller = $("#story-row");
if (scroller) {
  const prev = $("#stories-prev");
  const next = $("#stories-next");
  const update = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    prev.disabled = scroller.scrollLeft <= 8;
    next.disabled = scroller.scrollLeft >= max - 8;
  };
  const go = (dir) => {
    const card = $(".story", scroller);
    scroller.scrollBy({ left: (card ? card.getBoundingClientRect().width + 18 : scroller.clientWidth * 0.8) * dir, behavior: "smooth" });
  };
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  scroller.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- Gallery filter ---------- */
$$(".filters").forEach((bar) => {
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    $$("[data-filter]", bar).forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
    const f = btn.dataset.filter;
    $$("#gallery .tile").forEach((t) => (t.hidden = f !== "All" && t.dataset.type !== f));
  });
});

/* ---------- UTM capture ---------- */
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const utm = (() => {
  const fromUrl = {};
  UTM.forEach((k) => qp.get(k) && (fromUrl[k] = qp.get(k)));
  if (Object.keys(fromUrl).length) safe(() => localStorage.setItem("adu_utm", JSON.stringify(fromUrl)));
  return Object.keys(fromUrl).length ? fromUrl : safe(() => JSON.parse(localStorage.getItem("adu_utm") || "{}")) || {};
})();

/* ---------- Analytics + consent ---------- */
const track = (name, params = {}) => {
  safe(() => window.gtag && window.gtag("event", name, params));
  safe(() => window.fbq && window.fbq("trackCustom", name, params));
  safe(() => window.plausible && window.plausible(name, { props: params }));
};
window.aduTrack = track;

const addScript = (src, attrs = {}) => {
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
};

const loadConsented = () => {
  if (cfg.ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", cfg.ga4);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4)}`);
  }
  if (cfg.metaPixel) {
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", cfg.metaPixel);
    window.fbq("track", "PageView");
  }
};

if (cfg.plausible) addScript("https://plausible.io/js/script.tagged-events.js", { "data-domain": cfg.plausible });
if (cfg.ga4 || cfg.metaPixel) {
  const choice = safe(() => localStorage.getItem("adu_consent"));
  if (choice === "yes") loadConsented();
  else if (!choice) {
    const bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.innerHTML = `<p>We use analytics and advertising cookies to understand what works. <a href="/privacy/">Privacy policy</a></p><div><button type="button" class="btn btn--ghost" data-c="no">Decline</button><button type="button" class="btn btn--light" data-c="yes">Accept</button></div>`;
    bar.addEventListener("click", (e) => {
      const c = e.target.dataset.c;
      if (!c) return;
      safe(() => localStorage.setItem("adu_consent", c));
      bar.remove();
      if (c === "yes") loadConsented();
    });
    document.body.appendChild(bar);
  }
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-track]");
  if (a) track(a.dataset.track);
});

/* ---------- API forms (lead, newsletter, spec sheet, careers, ...) ---------- */
const validators = {
  name: [(v) => v.trim().length >= 2, "Add your name."],
  phone: [(v) => v.replace(/\D/g, "").length >= 10, "Use a 10-digit phone number."],
  friend_phone: [(v) => v.replace(/\D/g, "").length >= 10, "Use a 10-digit phone number."],
  email: [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Add a real email so we can send the next step."],
  city: [(v) => v.trim().length >= 2, "Tell us the city."],
  project: [(v) => v.trim().length > 0, "Choose what you want to build."],
};

const setFieldError = (input, message) => {
  const field = input.closest(".field") || input.parentElement;
  const slot = $(".err", field) || $(".err", field.parentElement);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field.classList.toggle("is-invalid", Boolean(message));
  if (slot) slot.textContent = message || "";
};

const checkInput = (input) => {
  const v = input.value || "";
  const rule = validators[input.name];
  if (input.required && !v.trim()) return rule ? rule[1] : "Required.";
  if (v.trim() && rule && !rule[0](v)) return rule[1];
  if (input.type === "file" && input.files) {
    if (input.files.length > 3) return "Up to 3 files.";
    for (const f of input.files) if (f.size > 4 * 1024 * 1024) return "Each file must be under 4 MB.";
  }
  return "";
};

$$("form[data-api-form]").forEach((form) => {
  const banner = $(".form-error", form);
  const success = form.parentElement.querySelector("[data-success]") || $("[data-success]", form);
  const submit = $("[type='submit']", form);
  const label = submit.textContent;
  const type = form.dataset.formType;

  const showError = (msg) => {
    if (!banner) return;
    banner.innerHTML = `${msg} You can also call <a href="tel:${cfg.phoneTel || ""}">${cfg.phone || ""}</a>.`;
    banner.hidden = false;
  };

  form.addEventListener("input", (e) => {
    if (e.target.getAttribute?.("aria-invalid") === "true") setFieldError(e.target, checkInput(e.target));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (banner) banner.hidden = true;

    let firstInvalid = null;
    $$("input, select, textarea", form).forEach((input) => {
      if (input.type === "hidden" || input.name === "_honey") return;
      const msg = checkInput(input);
      setFieldError(input, msg);
      if (msg && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) return firstInvalid.focus();

    const body = new FormData(form);
    body.set("_type", type);
    body.set("_page", location.href);
    Object.entries(utm).forEach(([k, v]) => body.set(k, v));
    $$("input[type='file']", form).forEach((f) => {
      if (!f.files.length) body.delete(f.name);
    });

    submit.disabled = true;
    submit.textContent = "Sending";
    try {
      const res = await fetch("/api/lead", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      track(`form_${type}`);
      if (form.dataset.redirect) {
        location.href = form.dataset.redirect;
        return;
      }
      if (success && form.contains(success)) {
        [...form.children].forEach((el) => el !== success && (el.hidden = true));
      } else {
        form.hidden = true;
      }
      if (success) success.hidden = false;
    } catch {
      showError("We couldn’t send that. Please try again.");
      submit.disabled = false;
      submit.textContent = label;
    }
  });
});

if (path.startsWith("/thank-you") && qp.get("t") === "lead") {
  track("generate_lead");
  safe(() => window.gtag && window.gtag("event", "generate_lead"));
  safe(() => window.fbq && window.fbq("track", "Lead"));
}

/* ---------- Calendar embed ---------- */
const cal = $("[data-calendar]");
if (cal && cfg.calendar) {
  const f = document.createElement("iframe");
  f.src = cfg.calendar;
  f.title = "Schedule a property analysis";
  f.loading = "lazy";
  f.className = "calendar";
  cal.appendChild(f);
}

/* ---------- Tools (loaded only where used) ---------- */
if ($("[data-tool]")) import("./tools.js").then((m) => m.initTools(track));

/* ---------- Floating UI: back to top, desktop CTA, chat, exit intent, search ---------- */
backTop.type = "button";
backTop.className = "backtop";
backTop.setAttribute("aria-label", "Back to top");
backTop.textContent = "↑";
backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.body.appendChild(backTop);

const conversionPage = /^\/(book|contact|thank-you|lp)\b/.test(path) || isMinimal;
floatCta.href = "/book/";
floatCta.className = "floatcta";
floatCta.textContent = "Free property analysis";
if (!conversionPage && !$("#consult")) document.body.appendChild(floatCta);
else if (!conversionPage) {
  // Home has the form on page: point the pill at it.
  floatCta.href = "#consult";
  document.body.appendChild(floatCta);
}

document.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const dialogSupported = typeof HTMLDialogElement === "function";

if (!isMinimal && dialogSupported) {
  // Chat / quick question
  const chatBtn = document.createElement("button");
  chatBtn.type = "button";
  chatBtn.className = "chat-btn";
  chatBtn.textContent = "Ask us";
  const chat = document.createElement("dialog");
  chat.className = "chat";
  chat.setAttribute("aria-label", "Ask a question");
  chat.innerHTML = `
    <form method="dialog" class="chat__close"><button aria-label="Close">×</button></form>
    <form data-api-form data-form-type="chat" novalidate>
      <h3>Quick question?</h3>
      <p class="form-lead">Send it here and we’ll reply by phone or email. Or <a href="tel:${cfg.phoneTel}">call ${cfg.phone}</a>.</p>
      <p class="form-error" role="alert" hidden></p>
      <label class="field"><span>Name</span><input name="name" autocomplete="name" required /><small class="err"></small></label>
      <label class="field"><span>Phone or email</span><input name="contact" required /><small class="err"></small></label>
      <label class="field"><span>Message</span><textarea name="message" rows="3" required></textarea><small class="err"></small></label>
      <label class="hp" aria-hidden="true">Company website<input type="text" name="_honey" tabindex="-1" autocomplete="off" /></label>
      <button class="btn btn--dark" type="submit">Send</button>
    </form>
    <div class="success" data-success hidden><h3>Thanks, we’ll reply soon.</h3></div>`;
  document.body.append(chatBtn, chat);
  chatBtn.addEventListener("click", () => chat.showModal());
  chat.addEventListener("click", (e) => e.target === chat && chat.close());
  wireLate(chat);

  // Search
  const sbtn = $("#nav-search");
  if (sbtn) {
    const dlg = document.createElement("dialog");
    dlg.className = "search";
    dlg.setAttribute("aria-label", "Search the site");
    dlg.innerHTML = `<form method="dialog" class="chat__close"><button aria-label="Close">×</button></form><label for="site-q" class="sr-only">Search</label><input id="site-q" type="search" placeholder="Search models, services, cities, FAQ…" autocomplete="off" /><ul id="site-results"></ul>`;
    document.body.appendChild(dlg);
    let index = null;
    const input = $("#site-q", dlg);
    const list = $("#site-results", dlg);
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !index) return (list.innerHTML = "");
      const words = q.split(/\s+/);
      const hits = index
        .map((p) => {
          const hay = `${p.t} ${p.d}`.toLowerCase();
          const score = words.reduce((s, w) => s + (p.t.toLowerCase().includes(w) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0);
          return { p, score, all: words.every((w) => hay.includes(w)) };
        })
        .filter((x) => x.all)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      list.innerHTML = hits.length
        ? hits.map(({ p }) => `<li><a href="${p.u}"><strong>${p.t.replace(/</g, "&lt;")}</strong><span>${p.d.replace(/</g, "&lt;")}</span></a></li>`).join("")
        : `<li class="none">No matches. Try “cost”, “permit” or a city name.</li>`;
    };
    sbtn.addEventListener("click", async () => {
      dlg.showModal();
      input.focus();
      if (!index) index = await fetch("/search-index.json").then((r) => r.json()).catch(() => []);
      render();
    });
    input.addEventListener("input", render);
    dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());
  }

  // Exit intent (desktop, once per session)
  if (!conversionPage && matchMedia("(hover: hover) and (min-width: 960px)").matches) {
    const shown = safe(() => sessionStorage.getItem("adu_exit"));
    if (!shown) {
      const exit = document.createElement("dialog");
      exit.className = "chat exit";
      exit.setAttribute("aria-label", "Before you go");
      exit.innerHTML = `<form method="dialog" class="chat__close"><button aria-label="Close">×</button></form><h3>Before you go</h3><p>Not sure your lot can fit an ADU? Get a first read in two minutes.</p><p><a class="btn btn--dark" href="/tools/feasibility-check/">Check my lot</a></p><p><a class="text-link" href="/book/">Or book a free property analysis</a></p>`;
      document.body.appendChild(exit);
      exit.addEventListener("click", (e) => e.target === exit && exit.close());
      const armedAt = Date.now();
      document.addEventListener("mouseout", (e) => {
        if (e.clientY > 0 || e.relatedTarget || Date.now() - armedAt < 8000) return;
        if (safe(() => sessionStorage.getItem("adu_exit")) || document.querySelector("dialog[open]")) return;
        safe(() => sessionStorage.setItem("adu_exit", "1"));
        exit.showModal();
      });
    }
  }
}

// Forms created after load (chat dialog) need the same submit logic. Re-run it on that node.
function wireLate(root) {
  const form = $("form[data-api-form]", root);
  const banner = $(".form-error", form);
  const success = $("[data-success]", root);
  const submit = $("[type='submit']", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    banner.hidden = true;
    let bad = null;
    $$("input, textarea", form).forEach((i) => {
      if (i.name === "_honey") return;
      const msg = i.required && !i.value.trim() ? "Required." : "";
      setFieldError(i, msg);
      if (msg && !bad) bad = i;
    });
    if (bad) return bad.focus();
    const body = new FormData(form);
    body.set("_type", "chat");
    body.set("_page", location.href);
    const contact = (body.get("contact") || "").toString();
    if (contact.includes("@")) body.set("email", contact);
    else body.set("phone_contact", contact);
    submit.disabled = true;
    try {
      const res = await fetch("/api/lead", { method: "POST", body });
      if (!res.ok) throw new Error();
      track("form_chat");
      form.hidden = true;
      success.hidden = false;
    } catch {
      banner.innerHTML = `We couldn’t send that. Please call <a href="tel:${cfg.phoneTel}">${cfg.phone}</a>.`;
      banner.hidden = false;
      submit.disabled = false;
    }
  });
}
