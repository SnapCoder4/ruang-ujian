import { api } from "./api.js";
import { mountIcons } from "./icons.js";
import { initThemeToggle } from "./theme.js";

mountIcons();
initThemeToggle(document.getElementById("tema"));

const form = document.getElementById("form-masuk");
const tombol = document.getElementById("tombol-masuk");
const errBox = document.getElementById("pesan-error");
const errTeks = document.getElementById("pesan-error-teks");

const pw = document.getElementById("password");
const lihat = document.getElementById("lihat-sandi");
lihat.addEventListener("click", () => {
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  lihat.setAttribute("aria-label", show ? "Sembunyikan sandi" : "Tampilkan sandi");
});

function tampilError(pesan) {
  errTeks.textContent = pesan;
  errBox.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const username = document.getElementById("username").value.trim();
  const password = pw.value;
  if (!username || !password) {
    tampilError("Nama pengguna dan sandi wajib diisi.");
    return;
  }
  tombol.setAttribute("aria-busy", "true");
  tombol.disabled = true;
  try {
    const hasil = await api("/api/login", { method: "POST", body: { username, password } });
    location.href = hasil.role === "dosen" ? "/dosen" : "/mahasiswa";
  } catch (err) {
    tampilError(err.message || "Gagal masuk.");
    tombol.removeAttribute("aria-busy");
    tombol.disabled = false;
  }
});
