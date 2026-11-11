import { api, requireUser, esc, waktu, toast } from "./api.js";
import { mountIcons, ICONS } from "./icons.js";
import { buildTopbar } from "./shell.js";

const me = await requireUser("dosen");
buildTopbar({ title: "Ruang Ujian", me });
document.getElementById("sapaan").textContent = `Halo, ${me.full_name}`;
mountIcons();

const pilihUjian = document.getElementById("pilih-ujian");
let ujianAktif = null;

async function muatUjian() {
  const list = await api("/api/dosen/ujian");
  if (!list.length) {
    pilihUjian.innerHTML = `<option>Belum ada ujian</option>`;
    document.getElementById("tabel-status").innerHTML =
      `<div class="empty">${ICONS.file}<p>Belum ada ujian. Buat lewat tombol di atas.</p></div>`;
    mountIcons(document.getElementById("tabel-status"));
    return;
  }
  pilihUjian.innerHTML = list.map((e) =>
    `<option value="${e.id}">${esc(e.course_code)} - ${esc(e.title)} (${e.jumlah_soal} soal)</option>`
  ).join("");
  ujianAktif = list[0].id;
  sinkronTautan();
  muatStatus();
}

function sinkronTautan() {
  document.getElementById("link-peringatan").href = `/peringatan?ujian=${ujianAktif}`;
  document.getElementById("link-editor").href = `/editor?ujian=${ujianAktif}`;
}

pilihUjian.addEventListener("change", () => {
  ujianAktif = pilihUjian.value;
  sinkronTautan();
  muatStatus();
});

function badgeStatus(s) {
  if (s.status === "selesai") return `<span class="badge badge-success">${ICONS.check}<span>Selesai</span></span>`;
  if (s.status === "berjalan") return `<span class="badge badge-info">${ICONS.clock}<span>Berjalan</span></span>`;
  return `<span class="badge badge-neutral">Belum mulai</span>`;
}

async function muatStatus() {
  const wrap = document.getElementById("tabel-status");
  wrap.innerHTML = `<p class="muted">Memuat…</p>`;
  try {
    const rows = await api(`/api/dosen/ujian/${ujianAktif}/status`);
    wrap.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Mahasiswa</th><th>NIM</th><th>Status</th><th class="num">Nilai</th><th>Peringatan</th><th>Aksi</th></tr></thead>
        <tbody>
          ${rows.map((s) => `
            <tr>
              <td>${esc(s.full_name)}</td>
              <td class="num">${esc(s.nim_nip || "-")}</td>
              <td>${badgeStatus(s)}</td>
              <td class="num">${s.score != null ? `<strong>${esc(s.score)}</strong>` : "-"}</td>
              <td>${Number(s.jumlah_peringatan) > 0
                  ? `<span class="badge badge-warning">${ICONS.alert}<span>${esc(s.jumlah_peringatan)}</span></span>`
                  : `<span class="muted">0</span>`}</td>
              <td>${s.session_id
                  ? `<button class="btn btn-sm" data-nilai="${s.session_id}" data-nama="${esc(s.full_name)}" data-skor="${s.score ?? ""}">${ICONS.edit}<span>Ubah nilai</span></button>`
                  : `<span class="muted">-</span>`}</td>
            </tr>`).join("")}
        </tbody>
      </table></div>`;
    mountIcons(wrap);
    wrap.querySelectorAll("[data-nilai]").forEach((b) =>
      b.addEventListener("click", () => bukaDialogNilai(b.dataset.nilai, b.dataset.nama, b.dataset.skor))
    );
  } catch (err) {
    wrap.innerHTML = `<p class="error-text">${ICONS.alert}<span>${esc(err.message)}</span></p>`;
    mountIcons(wrap);
  }
}

async function muatAudit() {
  const wrap = document.getElementById("tabel-audit");
  try {
    const rows = await api("/api/dosen/audit");
    if (!rows.length) {
      wrap.innerHTML = `<div class="empty">${ICONS.shield}<p>Belum ada aktivitas tercatat.</p></div>`;
      mountIcons(wrap);
      return;
    }
    wrap.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Detail</th><th>IP</th></tr></thead>
        <tbody>
          ${rows.map((a) => `
            <tr>
              <td>${waktu(a.created_at)}</td>
              <td>${esc(a.actor || "-")}</td>
              <td><span class="badge badge-neutral">${esc(a.action)}</span></td>
              <td style="white-space:normal">${esc(a.detail || "")}</td>
              <td class="num">${esc(a.ip || "-")}</td>
            </tr>`).join("")}
        </tbody>
      </table></div>`;
  } catch (err) {
    wrap.innerHTML = `<p class="error-text">${ICONS.alert}<span>${esc(err.message)}</span></p>`;
    mountIcons(wrap);
  }
}

// --- Dialog ubah nilai ---
const dlgNilai = document.getElementById("dlg-nilai");
let sesiNilai = null;
function bukaDialogNilai(sessionId, nama, skor) {
  sesiNilai = sessionId;
  document.getElementById("nilai-info").textContent = `${nama} · nilai saat ini: ${skor || "belum ada"}`;
  document.getElementById("nilai-baru").value = skor || "";
  document.getElementById("nilai-alasan").value = "";
  document.getElementById("nilai-error").hidden = true;
  dlgNilai.showModal();
}
document.getElementById("nilai-batal").addEventListener("click", () => dlgNilai.close());
document.getElementById("form-nilai").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("nilai-error");
  errBox.hidden = true;
  const score = parseFloat(document.getElementById("nilai-baru").value);
  const alasan = document.getElementById("nilai-alasan").value.trim();
  if (isNaN(score) || score < 0 || score > 100 || alasan.length < 5) {
    document.getElementById("nilai-error-teks").textContent = "Isi nilai 0-100 dan alasan minimal 5 karakter.";
    errBox.hidden = false;
    return;
  }
  try {
    await api(`/api/dosen/sesi/${sesiNilai}/nilai`, { method: "PUT", body: { score, alasan } });
    dlgNilai.close();
    toast("Nilai diperbarui dan tercatat.", "success");
    muatStatus();
    muatAudit();
  } catch (err) {
    document.getElementById("nilai-error-teks").textContent = err.message;
    errBox.hidden = false;
  }
});

// --- Ganti sandi ---
const dlgSandi = document.getElementById("dlg-sandi");
document.getElementById("btn-sandi").addEventListener("click", () => dlgSandi.showModal());
document.getElementById("sandi-batal").addEventListener("click", () => dlgSandi.close());
document.getElementById("form-sandi").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("sandi-error");
  errBox.hidden = true;
  const lama = document.getElementById("sandi-lama").value;
  const baru = document.getElementById("sandi-baru").value;
  if (baru.length < 8) {
    document.getElementById("sandi-error-teks").textContent = "Sandi baru minimal 8 karakter.";
    errBox.hidden = false;
    return;
  }
  try {
    await api("/api/ganti-sandi", { method: "POST", body: { sandi_lama: lama, sandi_baru: baru } });
    dlgSandi.close();
    e.target.reset();
    toast("Sandi berhasil diganti.", "success");
  } catch (err) {
    document.getElementById("sandi-error-teks").textContent = err.message;
    errBox.hidden = false;
  }
});

await muatUjian();
muatAudit();
