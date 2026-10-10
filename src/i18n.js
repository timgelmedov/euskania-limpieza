// String table. Spanish only for now; i18n-eu.js is kept for when Basque is switched back on
// (add it to DICTS and restore the ES/EU buttons in the nav).
// Strings are our own static copy, so data-i18n-html is safe to set as HTML.
import es from "./i18n-es.js";

const DICTS = { es };
let lang = "es";
const listeners = new Set();

export const t = (key, vars = {}) => {
  const s = DICTS[lang][key] ?? DICTS.es[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};
export const getLang = () => lang;
export const onLang = (fn) => listeners.add(fn);

export function setLang(next) {
  lang = DICTS[next] ? next : "es";
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  listeners.forEach((fn) => fn(lang));
}

export function initLang() {
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  setLang("es");
}
