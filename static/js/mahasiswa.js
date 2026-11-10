import { api, requireUser, esc, waktu, toast } from "./api.js";
import { mountIcons, ICONS } from "./icons.js";
import { buildTopbar } from "./shell.js";

const me = await requireUser("mahasiswa");
buildTopbar({ title: "Ruang Ujian", me });
document.getElementById("sapaan").textContent = `Halo, ${me.full_name} · ${me.nim_nip || ""}`;
mountIcons();

function statusUjian(u, now) {
  const mulai = new Date(u.starts_at), selesai = new Date(u.ends_at), skrg = new Date(now);
  if (u.status === "selesai") return { badge: "success", label: "Selesai dikerjakan", icon: "check", bisa: false };
  if (u.status === "berjalan") return { badge: "info", label: "Sedang berlangsung", icon: "clock", bisa: true };
  if (skrg < mulai) return { badge: "neutral", label: "Belum dibuka", icon: "clock", bisa: false };
  if (skrg > selesai) return { badge: "warning", label: "Jadwal berakhir", icon: "alert", bisa: false };
  return { badge: "info", label: "Terbuka", icon: "clock", bisa: true };
}

function kartuUjian(u, now) {
  const s = statusUjian(u, now);
  const aksi = s.bisa
    ? `<button class="btn btn-primary" data-mulai="${u.id}" style="width:100%">
         ${ICONS.send}<span>${u.status === "berjalan" ? "Lanjutkan" : "Mulai ujian"}</span></button>`
    : (u.status === "selesai" && u.session_id
        ? `<a class="btn" style="width:100%" href="/mahasiswa#hasil-${u.session_id}" data-hasil="${u.session_id}">${ICONS.award}<span>Lihat hasil</span></a>`
        : `<button class="btn" style="width:100%" disabled>Belum tersedia</button>`);
  return `
    <article class="card">
      <div class="row between">
        <span class="badge badge-info">${esc(u.course_code)}</span>
        <span class="badge badge-${s.badge}">${ICONS[s.icon]}<span>${esc(s.label)}</span></span>
      </div>
      <h3 style="margin-top:var(--sp-3)">${esc(u.title)}</h3>
      <p class="muted">${esc(u.course_name)} · ${esc(u.lecturer || "")}</p>
      <ul class="muted" style="list-style:none;padding:0;margin:var(--sp-3) 0;font-size:var(--fs-sm);display:grid;gap:4px">
        <li class="row"><span data-icon="calendar"></span> Buka: ${waktu(u.starts_at)}</li>
        <li class="row"><span data-icon="clock"></span> Durasi: ${esc(u.duration_minutes)} menit · ${esc(u.jumlah_soal)} soal</li>
      </ul>
      ${aksi}
    </article>`;
}

async function muatJadwal() {
  const wrap = document.getElementById("daftar-ujian");
  try {
    const list = await api("/api/ujian");
    const now = list[0]?.server_now || new Date().toISOString();
    if (!list.length) {
      wrap.innerHTML = `<div class="empty">${ICONS.calendar}<p>Belum ada ujian yang dijadwalkan.</p></div>`;
    } else {
      wrap.innerHTML = list.map((u) => kartuUjian(u, now)).join("");
      mountIcons(wrap);
    }
    renderNilai(list);
    wrap.querySelectorAll("[data-mulai]").forEach((b) =>
      b.addEventListener("click", () => mulai(b.dataset.mulai, b))
    );
  } catch (err) {
    wrap.innerHTML = `<div class="card error-text">${ICONS.alert}<span>${esc(err.message)}</span></div>`;
  }
}

function renderNilai(list) {
  const el = document.getElementById("kartu-nilai");
  const selesai = list.filter((u) => u.status === "selesai" && u.score != null);
  if (!selesai.length) {
    el.innerHTML = `<div class="empty">${ICONS.award}<p>Belum ada nilai. Nilai muncul setelah Anda mengirim ujian.</p></div>`;
    mountIcons(el);
    return;
  }
  el.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Ujian</th><th>Mata kuliah</th><th>Dikirim</th><th class="num">Nilai</th><th></th></tr></thead>
      <tbody>
        ${selesai.map((u) => `
          <tr>
            <td>${esc(u.title)}</td>
            <td>${esc(u.course_code)}</td>
            <td>${waktu(u.submitted_at)}</td>
            <td class="num"><strong>${esc(u.score)}</strong></td>
            <td><a class="btn btn-sm" href="#" data-hasil="${u.session_id}">Rincian</a></td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  el.querySelectorAll("[data-hasil]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); lihatHasil(a.dataset.hasil); })
  );
}

async function mulai(examId, btn) {
  btn.setAttribute("aria-busy", "true");
  btn.disabled = true;
  try {
    const r = await api(`/api/ujian/${examId}/mulai`, { method: "POST" });
    location.href = `/ujian?sesi=${r.session_id}`;
  } catch (err) {
    toast(err.message, "error");
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
  }
}

async function lihatHasil(sessionId) {
  try {
    const h = await api(`/api/hasil/${sessionId}`);
    const dlg = document.createElement("dialog");
    dlg.innerHTML = `
      <div class="row between"><h3>${esc(h.title)}</h3><span class="tag-score">${esc(h.score ?? "-")}</span></div>
      <p class="muted">${esc(h.course)} · dikirim ${waktu(h.submitted_at)}</p>
      <div class="table-wrap" style="margin-top:var(--sp-4);max-height:50vh;overflow:auto">
        <table><thead><tr><th>No</th><th>Jawaban</th><th>Hasil</th></tr></thead>
        <tbody>${h.rincian.map((r) => `
          <tr><td class="num">${esc(r.number)}</td>
          <td>${r.jawaban_label ? esc(r.jawaban_label) : "<span class='muted'>kosong</span>"}</td>
          <td>${r.benar
            ? `<span class="badge badge-success">${ICONS.check}<span>Benar</span></span>`
            : `<span class="badge badge-danger">${ICONS.x}<span>Salah</span></span>`}</td></tr>`).join("")}
        </tbody></table>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:var(--sp-5)">
        <button class="btn btn-primary" value="tutup">Tutup</button>
      </div>`;
    document.body.appendChild(dlg);
    mountIcons(dlg);
    dlg.querySelector("button").addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => dlg.remove());
    dlg.showModal();
  } catch (err) {
    toast(err.message, "error");
  }
}

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

muatJadwal();
