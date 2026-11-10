// Pembungkus fetch + util UI bersama (toast, escape, format waktu).

export async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: {}, credentials: "same-origin" };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);

  if (res.status === 401) {
    location.href = "/sesi-habis";
    throw new Error("Sesi habis");
  }
  if (res.status === 403) {
    location.href = "/error?kode=403";
    throw new Error("Akses ditolak");
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { detail: text }; }
  }
  if (!res.ok) {
    const pesan = (data && (data.detail || data.error)) || `Kesalahan ${res.status}`;
    throw new Error(pesan);
  }
  return data;
}

export async function requireUser(peran) {
  const me = await api("/api/me");
  if (peran && me.role !== peran) {
    location.href = "/error?kode=403";
    throw new Error("Peran tidak sesuai");
  }
  return me;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export function toast(pesan, tipe = "info") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${tipe}`;
  el.setAttribute("role", tipe === "error" ? "alert" : "status");
  el.textContent = pesan;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

const fmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
export function waktu(iso) {
  if (!iso) return "-";
  try { return fmt.format(new Date(iso)); } catch { return iso; }
}

export function mmss(detik) {
  detik = Math.max(0, Math.floor(detik));
  const j = Math.floor(detik / 3600);
  const m = Math.floor((detik % 3600) / 60);
  const d = detik % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return j > 0 ? `${pad(j)}:${pad(m)}:${pad(d)}` : `${pad(m)}:${pad(d)}`;
}

export async function logout() {
  try { await api("/api/logout", { method: "POST" }); } catch {}
  location.href = "/";
}
