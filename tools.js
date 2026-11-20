// Interactive tools: cost estimator, payment calculator, feasibility check, city check.
// All calculations run in the browser. Results are illustrative, never a quote.

const $ = (sel, root) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
const roundK = (n) => Math.round(n / 1000) * 1000;

const field = (id, label, control) => `<label class="field" for="${id}"><span>${label}</span>${control}</label>`;
const select = (id, options, extra = "") =>
  `<span class="select"><select id="${id}" ${extra}>${options.map((o) => `<option value="${esc(o.v ?? o)}">${esc(o.l ?? o)}</option>`).join("")}</select></span>`;

function estimator(el, track) {
  const cfg = JSON.parse(el.dataset.config);
  const { pricing, models } = cfg;
  el.innerHTML = `
    <div class="tool">
      <div class="tool__inputs">
        ${field("est-model", "Model", select("est-model", models.map((m, i) => ({ v: i, l: `${m.name} (${m.sqft[0]}–${m.sqft[1]} sq ft)` }))))}
        ${field("est-finish", "Finish level", select("est-finish", [{ v: "full", l: "Fully finished" }, { v: "shell", l: "Shell (you finish the interior)" }]))}
        <fieldset class="checks"><legend>Options</legend>
          <label><input type="checkbox" id="est-premium" /> Premium finishes and upgrades</label>
          <label><input type="checkbox" id="est-attached" /> Attached to the main house (breezeway or addition)</label>
          <label><input type="checkbox" id="est-site" /> Difficult site (slope, long utility runs, tight access)</label>
        </fieldset>
      </div>
      <div class="tool__result" aria-live="polite">
        <p class="eyebrow">Illustrative range</p>
        <p class="tool__big" id="est-out"></p>
        <p class="fine">Not a quote. Your free property analysis confirms scope and price for your lot.</p>
        <form class="tool__email" novalidate>
          <label class="field"><span>Email me this estimate</span><input type="email" name="email" autocomplete="email" required /><small class="err"></small></label>
          <button class="btn btn--dark" type="submit">Email it to me</button>
          <p class="fine" data-msg></p>
        </form>
        <a class="text-link" href="/book/">Book a free property analysis</a>
      </div>
    </div>`;
  const get = () => {
    const m = models[+$("#est-model", el).value];
    let uplift = 1;
    if ($("#est-premium", el).checked) uplift += pricing.upgradeUplift.premium;
    if ($("#est-attached", el).checked) uplift += pricing.upgradeUplift.attached;
    if ($("#est-site", el).checked) uplift += pricing.upgradeUplift.siteWork;
    const shell = $("#est-finish", el).value === "shell" ? pricing.shellFactor : 1;
    return {
      model: m.name,
      lo: roundK(m.sqft[0] * pricing.perSqftLow * uplift * shell),
      hi: roundK(m.sqft[1] * pricing.perSqftHigh * uplift * shell),
    };
  };
  const out = $("#est-out", el);
  const render = () => {
    const r = get();
    out.textContent = `${usd(r.lo)} – ${usd(r.hi)}`;
  };
  el.addEventListener("input", render);
  render();
  let tracked = false;
  el.addEventListener("change", () => {
    if (!tracked) {
      tracked = true;
      track("tool_estimator");
    }
  });
  const form = $("form", el);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const msg = $("[data-msg]", form);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $(".err", form).textContent = "Add a real email.";
      return;
    }
    $(".err", form).textContent = "";
    const r = get();
    const body = new FormData();
    body.set("_type", "estimate");
    body.set("email", email);
    body.set("model", r.model);
    body.set("finish", $("#est-finish", el).value);
    body.set("estimate", `${usd(r.lo)} - ${usd(r.hi)}`);
    body.set("_page", location.href);
    try {
      const res = await fetch("/api/lead", { method: "POST", body });
      if (!res.ok) throw new Error();
      msg.textContent = "Thanks, we’ll be in touch with next steps.";
      track("form_estimate");
    } catch {
      msg.textContent = "We couldn’t send that. Please call us instead.";
    }
  });
}

function payment(el, track) {
  el.innerHTML = `
    <div class="tool">
      <div class="tool__inputs">
        ${field("pay-amt", "Loan amount ($)", `<input id="pay-amt" type="number" min="1000" step="1000" value="150000" inputmode="numeric" />`)}
        ${field("pay-rate", "Interest rate (% APR)", `<input id="pay-rate" type="number" min="0" max="30" step="0.125" value="7.5" inputmode="decimal" />`)}
        ${field("pay-years", "Term (years)", `<input id="pay-years" type="number" min="1" max="40" step="1" value="20" inputmode="numeric" />`)}
      </div>
      <div class="tool__result" aria-live="polite">
        <p class="eyebrow">Estimated monthly payment</p>
        <p class="tool__big" id="pay-out"></p>
        <p class="fine" id="pay-detail"></p>
        <p class="fine">Illustrative only. Your lender sets the actual rate, fees and terms. This is not financial advice.</p>
        <a class="text-link" href="/financing/">See financing options</a>
      </div>
    </div>`;
  const render = () => {
    const P = Math.max(0, +$("#pay-amt", el).value || 0);
    const r = Math.max(0, +$("#pay-rate", el).value || 0) / 100 / 12;
    const n = Math.max(1, Math.round(+$("#pay-years", el).value || 1)) * 12;
    const m = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
    $("#pay-out", el).textContent = usd(m) + " / mo";
    $("#pay-detail", el).textContent = `Total interest about ${usd(m * n - P)} over ${n / 12} years.`;
  };
  let tracked = false;
  el.addEventListener("input", () => {
    render();
    if (!tracked) {
      tracked = true;
      track("tool_payment");
    }
  });
  render();
}

function feasibility(el, track) {
  const cfg = JSON.parse(el.dataset.config);
  const cities = [...new Set(cfg.markets.flatMap((m) => m.cities))];
  el.innerHTML = `
    <form class="tool" novalidate>
      <div class="tool__inputs">
        ${field("fz-city", "City", select("fz-city", [...cities, "Other / not listed"]))}
        ${field("fz-type", "What do you want to build?", select("fz-type", [
          { v: "ADU or granny flat", l: "Detached backyard home" },
          { v: "Garage conversion", l: "Garage conversion" },
          { v: "ADU or granny flat|attached", l: "Attached addition or breezeway" },
          { v: "Pool house", l: "Pool house" },
        ]))}
        ${field("fz-lot", "Approximate lot size (sq ft)", `<input id="fz-lot" type="number" min="500" step="100" placeholder="e.g. 6500" inputmode="numeric" required />`)}
        ${field("fz-access", "Access to the backyard", select("fz-access", ["Open access (gate or alley)", "Narrow side yard", "Not sure"]))}
        ${field("fz-hoa", "HOA", select("fz-hoa", ["No HOA", "I have an HOA", "Not sure"]))}
        <button class="btn btn--dark" type="submit">Check my lot</button>
      </div>
      <div class="tool__result" aria-live="polite" id="fz-out"><p class="eyebrow">Result</p><p class="fine">Answer the questions and press Check my lot.</p></div>
    </form>`;
  const form = $("form", el);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = $("#fz-city", el).value;
    const [project, attached] = $("#fz-type", el).value.split("|");
    const lot = +$("#fz-lot", el).value;
    const hoa = $("#fz-hoa", el).value;
    const access = $("#fz-access", el).value;
    const out = $("#fz-out", el);
    if (!lot || lot < 500) {
      out.innerHTML = `<p class="eyebrow">Result</p><p class="err">Enter your approximate lot size.</p>`;
      return;
    }
    let score = 0;
    const notes = [];
    const garage = project === "Garage conversion";
    if (garage) {
      score += 2;
      notes.push("Garage conversions use an existing footprint, so lot size matters less.");
    } else if (lot >= 7000) {
      score += 2;
      notes.push("Your lot size gives room for a detached or attached unit.");
    } else if (lot >= 4500) {
      score += 1;
      notes.push("Your lot may fit a compact unit, depending on setbacks and lot coverage.");
    } else {
      notes.push("A smaller lot can limit a new building. A garage conversion or attached addition may fit better.");
    }
    if (city.startsWith("Other")) notes.push("Your city isn’t one of our core markets. Ask us about affiliate cities.");
    else score += 1;
    if (hoa === "I have an HOA") {
      score -= 1;
      notes.push("HOAs can restrict or require approval for accessory buildings. Get your covenants early.");
    }
    if (access === "Narrow side yard") notes.push("Narrow access is fine for a stick-built home, since it’s framed on site with no crane.");
    notes.push("Setbacks, maximum size, parking and utilities vary by city and are confirmed in the property analysis.");

    const verdict = score >= 3 ? ["Looks promising", "Your answers are a good sign."] : score >= 1 ? ["Possible, needs review", "It could work. A closer look will tell."] : ["Needs a closer look", "Don’t rule it out yet. Other options may fit."];
    const params = new URLSearchParams({ project });
    if (!city.startsWith("Other")) params.set("city", city);
    out.innerHTML = `<p class="eyebrow">Result</p><p class="tool__big">${verdict[0]}</p><p>${verdict[1]}</p><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul><p class="fine">A rough screening, not a zoning or permit determination.</p><a class="btn btn--dark btn--auto" href="/book/?${params}">Book a free property analysis</a>`;
    track("tool_feasibility");
  });
}

function cityCheck(el) {
  el.innerHTML = `
    <label class="field" for="cc-city"><span>Your city</span><input id="cc-city" list="cc-list" autocomplete="address-level2" /></label>
    <datalist id="cc-list">${["Denver", "Colorado Springs", "Salt Lake City", "Chicago", "Naperville"].map((c) => `<option value="${c}"></option>`).join("")}</datalist>
    <p class="fine" id="cc-out" aria-live="polite"></p>`;
  const core = {
    denver: "Denver Metro",
    "colorado springs": "Colorado Springs",
    "salt lake city": "Salt Lake Metro",
    chicago: "Chicagoland",
    naperville: "Chicagoland",
  };
  $("#cc-city", el).addEventListener("input", (e) => {
    const v = e.target.value.trim().toLowerCase();
    const out = $("#cc-out", el);
    if (!v) return (out.textContent = "");
    out.innerHTML = core[v]
      ? `Yes, ${esc(e.target.value.trim())} is in our <strong>${core[v]}</strong> market. <a href="/book/?city=${encodeURIComponent(e.target.value.trim())}">Book your analysis</a>.`
      : `We may serve ${esc(e.target.value.trim())} as an affiliate city. <a href="/contact/">Ask us</a>.`;
  });
}

export function initTools(track = () => {}) {
  document.querySelectorAll("[data-tool]").forEach((el) => {
    const t = el.dataset.tool;
    if (t === "estimator") estimator(el, track);
    else if (t === "payment") payment(el, track);
    else if (t === "feasibility") feasibility(el, track);
    else if (t === "city-check") cityCheck(el);
  });
}
