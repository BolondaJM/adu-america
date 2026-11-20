// Editable site content. The site is rendered from these live objects, both at build time
// (scripts/generate.mjs) and at the edge (worker/site.js) when an admin has saved overrides.
//
// applyContent(c) replaces the live objects in place, so every module that imported them
// sees the new values. It is synchronous; call it and then render without awaiting between.
import { site, pricing, models, services, markets, projects, projectTypes, cityOptions } from "../site.config.mjs";
import { faqs, posts, legal } from "./content.mjs";

const clone = (v) => JSON.parse(JSON.stringify(v));

const live = { site, pricing, models, services, markets, projects, projectTypes, cityOptions, faqs, posts, legal };

// Snapshot of the code defaults, taken before anything can mutate them.
const DEFAULTS = clone(live);

export const defaultContent = () => clone(DEFAULTS);
export const CONTENT_KEYS = Object.keys(DEFAULTS);

const replaceArray = (arr, next) => arr.splice(0, arr.length, ...next);
const replaceObject = (obj, next) => {
  for (const k of Object.keys(obj)) delete obj[k];
  Object.assign(obj, next);
};

export function applyContent(content) {
  const c = { ...clone(DEFAULTS), ...clone(content || {}) };
  for (const key of CONTENT_KEYS) {
    if (Array.isArray(live[key])) replaceArray(live[key], Array.isArray(c[key]) ? c[key] : []);
    else replaceObject(live[key], c[key] && typeof c[key] === "object" ? c[key] : {});
  }
}

export const currentContent = () => clone(live);

// Structural checks run before a save. Returns a list of problems (empty = ok).
export function validateContent(c) {
  const errs = [];
  if (!c || typeof c !== "object") return ["Content must be an object."];
  for (const key of CONTENT_KEYS) {
    if (!(key in c)) errs.push(`Missing "${key}".`);
    else if (Array.isArray(DEFAULTS[key]) !== Array.isArray(c[key])) errs.push(`"${key}" has the wrong type.`);
  }
  if (errs.length) return errs;
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const lists = { models: "name", services: "name", markets: "name", projects: "title", posts: "title" };
  for (const [key, label] of Object.entries(lists)) {
    const seen = new Set();
    c[key].forEach((item, i) => {
      const where = `${key}[${i + 1}]`;
      if (!item || typeof item !== "object") return errs.push(`${where} is not an object.`);
      if (!String(item[label] || "").trim()) errs.push(`${where}: "${label}" is required.`);
      if (!slug.test(String(item.slug || ""))) errs.push(`${where}: slug must be lowercase letters, numbers and dashes.`);
      else if (seen.has(item.slug)) errs.push(`${where}: duplicate slug "${item.slug}".`);
      seen.add(item.slug);
    });
  }
  c.models.forEach((m, i) => {
    if (!Array.isArray(m.sqft) || m.sqft.length !== 2 || m.sqft.some((n) => !Number.isFinite(Number(n)) || Number(n) <= 0))
      errs.push(`models[${i + 1}]: size needs two positive numbers.`);
  });
  for (const k of ["perSqftLow", "perSqftHigh", "shellFactor"])
    if (!Number.isFinite(Number(c.pricing[k]))) errs.push(`pricing.${k} must be a number.`);
  if (!String(c.site.phone || "").trim() || !String(c.site.email || "").trim()) errs.push("Phone and email are required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.site.email || ""))) errs.push("Email address looks invalid.");
  c.faqs.forEach((f, i) => {
    if (!Array.isArray(f) || f.length !== 2 || !String(f[0]).trim() || !String(f[1]).trim()) errs.push(`faqs[${i + 1}] needs a question and an answer.`);
  });
  return errs;
}
