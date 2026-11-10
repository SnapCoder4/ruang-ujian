// Topbar bersama + util dialog.
import { mountIcons, ICONS } from "./icons.js";
import { initThemeToggle } from "./theme.js";
import { logout, esc } from "./api.js";

export function buildTopbar({ title, me, links = [] }) {
  const bar = document.createElement("header");
  bar.className = "topbar";
  const navHtml = links
    .map((l) => `<a class="btn btn-sm btn-ghost" href="${l.href}">${ICONS[l.icon] || ""}<span>${esc(l.label)}</span></a>`)
    .join("");
  bar.innerHTML = `
    <div class="brand"><span class="brand-mark" data-icon="logo"></span><span>${esc(title)}</span></div>
    <nav class="row" style="gap:var(--sp-1)">${navHtml}</nav>
    <span class="spacer"></span>
    <span class="badge badge-neutral" title="Peran">${esc(me ? me.role : "")}</span>
    <span class="muted" style="font-size:var(--fs-sm)">${esc(me ? me.full_name : "")}</span>
    <button class="btn btn-icon btn-ghost" id="tema-btn" type="button"></button>
    <button class="btn btn-sm btn-ghost" id="keluar-btn" type="button">${ICONS.logout}<span>Keluar</span></button>
  `;
  document.body.prepend(bar);
  mountIcons(bar);
  initThemeToggle(bar.querySelector("#tema-btn"));
  bar.querySelector("#keluar-btn").addEventListener("click", logout);
  return bar;
}

export function confirmDialog({ title, message, okLabel = "Lanjutkan", danger = false }) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.innerHTML = `
      <h3>${esc(title)}</h3>
      <p class="muted">${esc(message)}</p>
      <div class="row between" style="margin-top:var(--sp-5)">
        <button class="btn" value="batal">Batal</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" value="ok">${esc(okLabel)}</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => { dlg.close(); resolve(b.value === "ok"); })
    );
    dlg.addEventListener("close", () => dlg.remove());
    dlg.showModal();
  });
}
