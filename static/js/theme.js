// Ganti tema terang/gelap. Bawaan ikut sistem, pilihan disimpan di localStorage.
import { ICONS } from "./icons.js";

const KEY = "ruang-ujian-tema";

function terapkan(tema) {
  if (tema === "light" || tema === "dark") {
    document.documentElement.setAttribute("data-theme", tema);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function temaTersimpan() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function aktifSekarang() {
  const simpan = temaTersimpan();
  if (simpan) return simpan;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Terapkan sedini mungkin agar tidak berkedip
terapkan(temaTersimpan());

export function initThemeToggle(btn) {
  if (!btn) return;
  const render = () => {
    const gelap = aktifSekarang() === "dark";
    btn.innerHTML = gelap ? ICONS.sun : ICONS.moon;
    btn.setAttribute("aria-label", gelap ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    btn.setAttribute("title", gelap ? "Mode terang" : "Mode gelap");
  };
  render();
  btn.addEventListener("click", () => {
    const baru = aktifSekarang() === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, baru); } catch {}
    terapkan(baru);
    render();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!temaTersimpan()) { terapkan(null); render(); }
  });
}
