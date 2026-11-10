import { api, requireUser, esc, mmss, toast } from "./api.js";
import { mountIcons, ICONS } from "./icons.js";
import { buildTopbar } from "./shell.js";
import { confirmDialog } from "./shell.js";

const me = await requireUser("mahasiswa");
buildTopbar({ title: "Ruang Ujian", me });

const params = new URLSearchParams(location.search);
const sessionId = params.get("sesi");

let data = null;
let idx = 0;
let sisaDetik = 0;
let timerId = null;
let sudahKirim = false;

function gagal(pesan) {
  document.getElementById("muat").hidden = true;
  const g = document.getElementById("gagal");
  g.hidden = false;
  document.getElementById("gagal-teks").textContent = pesan;
  mountIcons(g);
}

async function muat() {
  if (!sessionId) return gagal("Sesi ujian tidak ditemukan.");
  try {
    data = await api(`/api/sesi/${sessionId}`);
  } catch (err) {
    return gagal(err.message);
  }
  document.getElementById("muat").hidden = true;
  document.getElementById("ruang").hidden = false;
  document.getElementById("judul-ujian").textContent = data.title;
  document.getElementById("sub-ujian").textContent = `${data.course} · ${data.questions.length} soal`;

  const selisih = (new Date(data.deadline_at) - new Date(data.server_now)) / 1000;
  sisaDetik = Math.max(0, Math.floor(selisih));
  jalankanTimer();

  bangunNav();
  render();
  mountIcons();
  pasangPengawas();
}

function jalankanTimer() {
  const el = document.getElementById("timer");
  const teks = document.getElementById("timer-teks");
  const tick = () => {
    teks.textContent = mmss(sisaDetik);
    el.classList.toggle("warning", sisaDetik <= 300 && sisaDetik > 60);
    el.classList.toggle("danger", sisaDetik <= 60);
    if (sisaDetik <= 0) {
      clearInterval(timerId);
      toast("Waktu habis. Mengirim jawaban…", "info");
      kirim(true);
      return;
    }
    sisaDetik -= 1;
  };
  tick();
  timerId = setInterval(tick, 1000);
}

function bangunNav() {
  const nav = document.getElementById("qnav");
  nav.innerHTML = data.questions.map((q, i) =>
    `<button type="button" data-i="${i}" aria-label="Soal ${q.number}">${q.number}</button>`
  ).join("");
  nav.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => { idx = Number(b.dataset.i); render(); })
  );
}

function perbaruiNav() {
  const nav = document.getElementById("qnav");
  let terisi = 0;
  nav.querySelectorAll("button").forEach((b, i) => {
    const q = data.questions[i];
    const dijawab = data.answers[q.id] != null;
    if (dijawab) terisi += 1;
    b.classList.toggle("answered", dijawab);
    b.classList.toggle("current", i === idx);
  });
  document.getElementById("ringkas").textContent = `${terisi} dari ${data.questions.length} soal terisi.`;
}

function render() {
  const q = data.questions[idx];
  document.getElementById("q-label").textContent = `Soal ${q.number}`;
  document.getElementById("q-progress").textContent = `${idx + 1} / ${data.questions.length}`;
  document.getElementById("q-body").textContent = q.body;

  const wrap = document.getElementById("q-options");
  const dipilih = data.answers[q.id];
  wrap.innerHTML = q.options.map((o) => {
    const sel = o.id === dipilih;
    return `<button type="button" class="bubble-row ${sel ? "selected" : ""}" role="radio"
              aria-checked="${sel}" data-opt="${o.id}">
              <span class="bubble">${esc(o.label)}</span>
              <span class="opt-body">${esc(o.body)}</span>
            </button>`;
  }).join("");
  wrap.querySelectorAll("[data-opt]").forEach((b) =>
    b.addEventListener("click", () => pilih(q.id, Number(b.dataset.opt)))
  );

  document.getElementById("btn-prev").disabled = idx === 0;
  const next = document.getElementById("btn-next");
  next.disabled = idx === data.questions.length - 1;
  perbaruiNav();
}

async function pilih(questionId, optionId) {
  const sebelumnya = data.answers[questionId];
  data.answers[questionId] = optionId;
  render();
  try {
    await api(`/api/sesi/${sessionId}/jawab`, {
      method: "PUT",
      body: { question_id: questionId, option_id: optionId },
    });
  } catch (err) {
    data.answers[questionId] = sebelumnya;
    render();
    toast("Gagal menyimpan jawaban: " + err.message, "error");
  }
}

async function kirim(otomatis = false) {
  if (sudahKirim) return;
  if (!otomatis) {
    const belum = data.questions.filter((q) => data.answers[q.id] == null).length;
    const pesan = belum
      ? `Masih ada ${belum} soal yang belum dijawab. Kirim sekarang?`
      : "Semua soal sudah dijawab. Kirim ujian?";
    const ok = await confirmDialog({ title: "Kirim ujian", message: pesan, okLabel: "Kirim" });
    if (!ok) return;
  }
  sudahKirim = true;
  clearInterval(timerId);
  try {
    const r = await api(`/api/sesi/${sessionId}/kirim`, { method: "POST" });
    toast(`Ujian terkirim. Nilai: ${r.score}`, "success");
    setTimeout(() => (location.href = "/mahasiswa"), 1200);
  } catch (err) {
    sudahKirim = false;
    toast(err.message, "error");
  }
}

function pasangPengawas() {
  // Lapor saat jendela kehilangan fokus (pindah tab) / keluar layar penuh.
  let laporTerakhir = 0;
  const lapor = (event, detail) => {
    const now = Date.now();
    if (now - laporTerakhir < 3000) return;
    laporTerakhir = now;
    api(`/api/sesi/${sessionId}/peringatan`, { method: "POST", body: { event, detail } }).catch(() => {});
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !sudahKirim) lapor("pindah_tab", "Tab ujian ditinggalkan");
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !sudahKirim) lapor("keluar_layar_penuh", "Keluar dari mode layar penuh");
  });
}

document.getElementById("btn-prev").addEventListener("click", () => { if (idx > 0) { idx -= 1; render(); } });
document.getElementById("btn-next").addEventListener("click", () => { if (idx < data.questions.length - 1) { idx += 1; render(); } });
document.getElementById("btn-kirim").addEventListener("click", () => kirim(false));

window.addEventListener("beforeunload", (e) => {
  if (!sudahKirim && data) { e.preventDefault(); e.returnValue = ""; }
});

muat();
