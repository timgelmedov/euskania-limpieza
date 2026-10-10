// Audit request form. Prototype: validates locally and sends nothing anywhere.
import { t } from "./i18n.js";

// Spanish numbers: optional +34 / 0034, then 9 digits starting 6-9; spaces and dashes tolerated.
export function normalizePhone(raw) {
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = digits.match(/^(?:\+34|0034)?([6-9]\d{8})$/);
  return m ? `+34${m[1]}` : null;
}

export function initForm() {
  const form = document.getElementById("auditForm");
  const note = document.getElementById("formNote");
  const field = (n) => form.elements.namedItem(n);
  form.addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = [];
    const company = field("company").value.trim();
    const email = field("email").value.trim();
    const phone = normalizePhone(field("phone").value);
    if (!company) bad.push("company");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad.push("email");
    if (!phone) bad.push("phone");
    if (!field("consent").checked) bad.push("consent");
    bad.forEach((n) => field(n).setAttribute("aria-invalid", "true"));
    note.className = "form-note";
    if (bad.length) {
      note.classList.add("err");
      note.textContent = bad.includes("company") || bad.includes("consent") || (bad.includes("email") && bad.includes("phone"))
        ? t("audit.err.required")
        : bad.includes("email") ? t("audit.err.email") : t("audit.err.phone");
      field(bad[0]).focus();
      return;
    }
    note.classList.add("ok");
    note.textContent = t("audit.ok", { phone });
  });
}
