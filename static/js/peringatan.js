import { api, requireUser, esc, waktu } from "./api.js";
import { mountIcons, ICONS } from "./icons.js";
import { buildTopbar } from "./shell.js";

const me = await requireUser("dosen");
buildTopbar({ title: "Ruang Ujian", me });
mountIcons();

const params = new URLSearchParams(location.search);
const ujian = params.get("ujian");
let level = "";

const LEVEL = {
  rendah: { badge: "badge-neutral", teks: "Rendah", icon: "info" },
  sedang: { badge: "badge-warning", teks: "Sedang", icon: "alert" },
  tinggi: { badge: "badge-danger", teks: "Tinggi", icon: "shield" },
};
const EVENT = {
  pindah_tab: "Pindah tab / keluar fokus",
  keluar_layar_penuh: "Keluar layar penuh",
  dua_perangkat: "Terdeteksi dua perangkat",
};

async function muat() {
  const wrap = document.getElementById("tabel");
  wrap.innerHTML = `<p class="muted">Memuat…</p>`;
  const q = new URLSearchParams();
  if (ujian) q.set("ujian", ujian);
  if (level) q.set("level", level);
  try {
    const rows = await api(`/api/dosen/peringatan?${q.toString()}`);
    if (!rows.length) {
      wrap.innerHTML = `<div class="empty">${ICONS.shield}<p>Tidak ada peringatan untuk saringan ini.</p></div>`;
      mountIcons(wrap);
      return;
    }
    wrap.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Waktu</th><th>Mahasiswa</th><th>Ujian</th><th>Kejadian</th><th>Tingkat</th><th>Detail</th></tr></thead>
        <tbody>
          ${rows.map((w) => {
            const lv = LEVEL[w.level] || LEVEL.rendah;
            return `<tr>
              <td>${waktu(w.created_at)}</td>
              <td>${esc(w.student_name)}</td>
              <td>${esc(w.exam_title)}</td>
              <td>${esc(EVENT[w.event] || w.event)}</td>
              <td><span class="badge ${lv.badge}">${ICONS[lv.icon]}<span>${lv.teks}</span></span></td>
              <td style="white-space:normal">${esc(w.detail || "")}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>`;
    mountIcons(wrap);
  } catch (err) {
    wrap.innerHTML = `<p class="error-text">${ICONS.alert}<span>${esc(err.message)}</span></p>`;
    mountIcons(wrap);
  }
}

document.querySelectorAll("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    level = b.dataset.level;
    document.querySelectorAll("[data-level]").forEach((x) => {
      const aktif = x === b;
      x.classList.toggle("btn-primary", aktif);
      x.setAttribute("aria-pressed", String(aktif));
    });
    muat();
  })
);

muat();
