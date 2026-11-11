import { api, requireUser, esc, toast } from "./api.js";
import { mountIcons, ICONS } from "./icons.js";
import { buildTopbar, confirmDialog } from "./shell.js";

const me = await requireUser("dosen");
buildTopbar({ title: "Ruang Ujian", me });
mountIcons();

const LABELS = ["A", "B", "C", "D"];
const pilihUjian = document.getElementById("pilih-ujian");
let ujianAktif = null;
let soalEdit = null; // null = tambah, angka = id soal

// --- Buat ujian ---
async function muatCourses() {
  const list = await api("/api/dosen/courses");
  document.getElementById("u-course").innerHTML = list.map((c) =>
    `<option value="${c.id}">${esc(c.code)} - ${esc(c.name)}</option>`
  ).join("");
}

document.getElementById("form-ujian").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("u-error");
  errBox.hidden = true;
  const body = {
    course_id: Number(document.getElementById("u-course").value),
    title: document.getElementById("u-judul").value.trim(),
    starts_at: new Date(document.getElementById("u-mulai").value).toISOString(),
    ends_at: new Date(document.getElementById("u-selesai").value).toISOString(),
    duration_minutes: Number(document.getElementById("u-durasi").value),
    is_published: document.getElementById("u-publish").checked,
  };
  if (!body.title || !document.getElementById("u-mulai").value || !document.getElementById("u-selesai").value) {
    document.getElementById("u-error-teks").textContent = "Lengkapi judul, mulai, dan selesai.";
    errBox.hidden = false;
    return;
  }
  if (new Date(body.ends_at) <= new Date(body.starts_at)) {
    document.getElementById("u-error-teks").textContent = "Waktu selesai harus setelah waktu mulai.";
    errBox.hidden = false;
    return;
  }
  try {
    const r = await api("/api/dosen/ujian", { method: "POST", body });
    toast("Ujian dibuat.", "success");
    e.target.reset();
    document.getElementById("u-durasi").value = 60;
    await muatUjian();
    pilihUjian.value = r.id;
    ujianAktif = r.id;
    muatSoal();
  } catch (err) {
    document.getElementById("u-error-teks").textContent = err.message;
    errBox.hidden = false;
  }
});

// --- Bank soal ---
async function muatUjian() {
  const list = await api("/api/dosen/ujian");
  if (!list.length) {
    pilihUjian.innerHTML = `<option value="">Belum ada ujian</option>`;
    return;
  }
  pilihUjian.innerHTML = list.map((e) =>
    `<option value="${e.id}">${esc(e.course_code)} - ${esc(e.title)}</option>`
  ).join("");
  const params = new URLSearchParams(location.search);
  ujianAktif = params.get("ujian") || list[0].id;
  pilihUjian.value = ujianAktif;
  if (!pilihUjian.value) { ujianAktif = list[0].id; pilihUjian.value = ujianAktif; }
}

pilihUjian.addEventListener("change", () => { ujianAktif = pilihUjian.value; muatSoal(); });

async function muatSoal() {
  const wrap = document.getElementById("daftar-soal");
  if (!ujianAktif) { wrap.innerHTML = `<p class="muted">Belum ada ujian.</p>`; return; }
  wrap.innerHTML = `<p class="muted">Memuat…</p>`;
  try {
    const soal = await api(`/api/dosen/ujian/${ujianAktif}/soal`);
    if (!soal.length) {
      wrap.innerHTML = `<div class="empty">${ICONS.list}<p>Belum ada soal. Klik "Tambah soal".</p></div>`;
      mountIcons(wrap);
      return;
    }
    wrap.innerHTML = soal.map((q) => `
      <article class="card" style="box-shadow:none">
        <div class="row between">
          <strong>Soal ${esc(q.number)}</strong>
          <div class="row" style="gap:var(--sp-2)">
            <button class="btn btn-sm" data-ubah="${q.id}">${ICONS.edit}<span>Ubah</span></button>
            <button class="btn btn-sm btn-danger" data-hapus="${q.id}">${ICONS.trash}<span class="sr-only">Hapus</span></button>
          </div>
        </div>
        <p style="margin:var(--sp-2) 0">${esc(q.body)}</p>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:4px">
          ${q.options.map((o) => `
            <li class="row">
              <span class="bubble" style="width:26px;height:26px;font-size:var(--fs-xs)">${esc(o.label)}</span>
              <span>${esc(o.body)}</span>
              ${o.is_correct ? `<span class="badge badge-success">${ICONS.check}<span>Kunci</span></span>` : ""}
            </li>`).join("")}
        </ul>
      </article>`).join("");
    mountIcons(wrap);
    wrap.querySelectorAll("[data-ubah]").forEach((b) =>
      b.addEventListener("click", () => bukaSoal(soal.find((q) => q.id == b.dataset.ubah)))
    );
    wrap.querySelectorAll("[data-hapus]").forEach((b) =>
      b.addEventListener("click", () => hapusSoal(b.dataset.hapus))
    );
  } catch (err) {
    wrap.innerHTML = `<p class="error-text">${ICONS.alert}<span>${esc(err.message)}</span></p>`;
    mountIcons(wrap);
  }
}

// --- Dialog soal ---
const dlgSoal = document.getElementById("dlg-soal");
const optList = document.getElementById("opt-list");

function renderOpsi(options) {
  optList.innerHTML = LABELS.map((label, i) => {
    const o = options?.[i] || { body: "", is_correct: false };
    return `<div class="opt-edit">
      <span class="bubble">${label}</span>
      <input class="input" data-opt-body="${label}" value="${esc(o.body)}" placeholder="Isi pilihan ${label}" required>
      <label class="pilih-benar"><input type="radio" name="benar" value="${label}" ${o.is_correct ? "checked" : ""} style="width:auto;min-height:auto"> Benar</label>
    </div>`;
  }).join("");
}

function bukaSoal(q) {
  soalEdit = q ? q.id : null;
  document.getElementById("soal-judul").textContent = q ? `Ubah Soal ${q.number}` : "Tambah Soal";
  document.getElementById("s-nomor").value = q ? q.number : "";
  document.getElementById("s-body").value = q ? q.body : "";
  renderOpsi(q ? q.options : null);
  document.getElementById("s-error").hidden = true;
  dlgSoal.showModal();
}

document.getElementById("btn-tambah-soal").addEventListener("click", () => {
  if (!ujianAktif) { toast("Buat atau pilih ujian dulu.", "error"); return; }
  bukaSoal(null);
});
document.getElementById("s-batal").addEventListener("click", () => dlgSoal.close());

document.getElementById("form-soal").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("s-error");
  errBox.hidden = true;
  const options = LABELS.map((label) => ({
    label,
    body: optList.querySelector(`[data-opt-body="${label}"]`).value.trim(),
    is_correct: optList.querySelector('input[name="benar"]:checked')?.value === label,
  }));
  const benar = options.filter((o) => o.is_correct).length;
  if (options.some((o) => !o.body)) {
    tampil(errBox, "Semua empat pilihan harus diisi.");
    return;
  }
  if (benar !== 1) {
    tampil(errBox, "Tandai tepat satu pilihan sebagai jawaban benar.");
    return;
  }
  const body = {
    number: Number(document.getElementById("s-nomor").value),
    body: document.getElementById("s-body").value.trim(),
    options,
  };
  try {
    if (soalEdit) await api(`/api/dosen/soal/${soalEdit}`, { method: "PUT", body });
    else await api(`/api/dosen/ujian/${ujianAktif}/soal`, { method: "POST", body });
    dlgSoal.close();
    toast("Soal disimpan.", "success");
    muatSoal();
  } catch (err) {
    tampil(errBox, err.message);
  }
});

function tampil(box, pesan) {
  box.querySelector("span:last-child").textContent = pesan;
  box.hidden = false;
}

async function hapusSoal(id) {
  const ok = await confirmDialog({ title: "Hapus soal", message: "Soal dan pilihannya akan dihapus permanen.", okLabel: "Hapus", danger: true });
  if (!ok) return;
  try {
    await api(`/api/dosen/soal/${id}`, { method: "DELETE" });
    toast("Soal dihapus.", "success");
    muatSoal();
  } catch (err) {
    toast(err.message, "error");
  }
}

await muatCourses();
await muatUjian();
muatSoal();
