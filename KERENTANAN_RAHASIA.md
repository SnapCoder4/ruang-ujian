# Daftar Kerentanan yang Sengaja Ditanam (RAHASIA)

> Dokumen kunci untuk evaluasi. **Jangan dibagikan ke penguji sebelum tahap evaluasi selesai.**
> Kerentanan tidak ditandai di kode agar menyerupai kesalahan pemula yang wajar.
> Penomoran kategori mengikuti **OWASP Top 10:2025**.
>
> Tema fokus: **(K) kebocoran soal/kunci jawaban** dan **(M) manipulasi nilai**.

Ringkasan: 8 kelemahan tersebar di 8 kategori. Kategori yang **dibiarkan aman**
sebagai pembanding: **A03** (Software Supply Chain) dan **A08** (Software or Data
Integrity Failures).

---

## V1 — A01 Broken Access Control (IDOR pada hasil ujian) · tema K + M

- **Lokasi:** `main.py` baris ~368–415, fungsi `hasil_ujian` (`GET /api/hasil/{session_id}`).
- **Masalah:** endpoint hanya memakai `Depends(current_user)` tanpa memverifikasi
  bahwa `session_id` milik pengguna yang sedang login. Respons juga menyertakan
  `kunci_label` (label jawaban benar) untuk setiap soal.
- **Cara eksploitasi:**
  - Login sebagai mahasiswa mana pun, lalu akses `GET /api/hasil/1`, `/2`, `/3`, …
    secara berurutan untuk membaca nilai dan rincian jawaban mahasiswa lain.
  - Karena respons memuat kunci jawaban, mahasiswa yang sudah memulai sesi dapat
    memanggil `GET /api/hasil/{session_id_miliknya}` **sebelum mengirim** untuk
    memperoleh seluruh kunci jawaban.
- **Dampak:** kebocoran nilai seluruh mahasiswa (privasi) **dan** kebocoran kunci
  jawaban → kedua tema utama tugas terpenuhi lewat satu titik.
- **Perbaikan:**
  - Tambahkan pemeriksaan kepemilikan: untuk mahasiswa, pastikan
    `exam_sessions.student_id = user.id`; untuk dosen, batasi pada ujian yang diampu.
  - Jangan kirim `kunci_label`/`is_correct` ke mahasiswa; tampilkan kunci hanya
    setelah sesi `selesai` dan hanya untuk peran yang berhak.

## V2 — A02 Security Misconfiguration (mode debug aktif) · tema K/M (pendukung)

- **Lokasi:** `db.py` baris 7 (`DEBUG = True`) dan `main.py` baris ~23
  (`FastAPI(..., debug=DEBUG)`).
- **Masalah:** mode debug framework dibiarkan menyala di lingkungan yang
  diperlakukan seperti produksi.
- **Cara eksploitasi:** picu error apa pun; FastAPI/Starlette dalam mode debug
  mengembalikan informasi internal yang lebih kaya, mempermudah pemetaan aplikasi.
- **Dampak:** membantu penyerang memahami struktur internal (memperkuat V5/V8).
- **Perbaikan:** set `DEBUG = False` dari variabel lingkungan, nonaktifkan debug
  framework saat deployment.

## V3 — A04 Cryptographic Failures (hash sandi lemah) · pendukung

- **Lokasi:** `auth.py` baris 13–14, fungsi `hash_password` (MD5 tanpa salt).
- **Masalah:** sandi disimpan sebagai MD5 tanpa salt. Hash sama untuk sandi sama,
  rentan rainbow table dan sangat cepat di-brute force.
- **Cara eksploitasi:** jika dump tabel `users` diperoleh (mis. lewat V5), hash
  MD5 seperti `482c811da5d5b4bc6d497ffa98491e38` langsung terpecah menjadi
  `password123` via basis data hash daring.
- **Dampak:** pemulihan sandi massal → pengambilalihan akun → manipulasi nilai.
- **Perbaikan:** gunakan algoritma lambat dengan salt (bcrypt/argon2/scrypt),
  mis. `passlib[bcrypt]`.

## V4 — A05 Injection (SQL injection pada login) · tema M

- **Lokasi:** `main.py` baris ~122–126, fungsi `login` — query disusun dengan
  f-string memakai `username` dan `pw_hash`.
- **Masalah:** input pengguna digabung langsung ke string SQL tanpa parameterisasi.
- **Cara eksploitasi:** kirim `POST /api/login` dengan
  `username = andi' -- ` (spasi setelah `--`) dan sembarang sandi. Query menjadi
  `... WHERE username = 'andi' -- ' AND password_hash = '...'`, sehingga bagian
  pengecekan sandi terkomentari dan login berhasil tanpa sandi benar.
  Payload `' OR '1'='1' LIMIT 1 -- ` juga dapat masuk sebagai pengguna pertama.
- **Dampak:** bypass autentikasi → masuk sebagai dosen → mengubah nilai; serta
  potensi pembacaan data lain lewat injeksi lanjutan.
- **Perbaikan:** gunakan query berparameter, mis.
  `cur.execute("SELECT ... WHERE username = %s AND password_hash = %s", (username, pw_hash))`.

## V5 — A06 Insecure Design (timer hanya di klien, server tidak menolak keterlambatan) · tema M

- **Lokasi:** `main.py` fungsi `simpan_jawaban` (baris ~290–325) dan `kirim_ujian`
  (baris ~329–348). Keduanya hanya memeriksa `status`, tidak membandingkan
  `NOW()` dengan `exam_sessions.deadline_at`. Timer sepenuhnya dihitung di
  `static/js/ujian.js`.
- **Masalah:** batas waktu ujian hanya ditegakkan di sisi klien.
- **Cara eksploitasi:** selama `status` masih `berjalan`, kirim
  `PUT /api/sesi/{id}/jawab` dan `POST /api/sesi/{id}/kirim` lewat curl/Burp
  kapan pun setelah waktu seharusnya habis. Jawaban tetap diterima dan dinilai.
- **Dampak:** mahasiswa memperoleh waktu tak terbatas → manipulasi nilai.
- **Perbaikan:** di server, tolak penyimpanan/kiriman jika `NOW() > deadline_at`,
  dan jalankan auto-submit berbasis server (bukan hanya JS).

## V6 — A07 Authentication Failures (tanpa pembatasan percobaan login) · pendukung

- **Lokasi:** `main.py` fungsi `login` (baris ~118–135) — tidak ada penghitung
  percobaan, penguncian akun, atau jeda.
- **Masalah:** login dapat dicoba tanpa batas.
- **Cara eksploitasi:** jalankan brute force/credential stuffing (Hydra, Burp
  Intruder) terhadap `POST /api/login`.
- **Dampak:** penebakan sandi (diperparah V3 yang membuat sandi lemah mudah
  dipakai) → pengambilalihan akun dosen → manipulasi nilai.
- **Perbaikan:** batasi laju per IP/akun, kunci sementara setelah sejumlah gagal,
  tambahkan CAPTCHA/penundaan bertahap.

## V7 — A09 Logging & Alerting Failures (login gagal tidak dicatat) · pendukung

- **Lokasi:** `main.py` fungsi `login` (baris ~127–130). `write_audit` hanya
  dipanggil saat login **sukses**; cabang gagal (baris ~128) langsung
  `raise HTTPException(401)` tanpa menulis ke `audit_logs`.
- **Masalah:** upaya login gagal tidak terekam sama sekali.
- **Cara eksploitasi:** serangan brute force (V6) berlangsung tanpa jejak di
  `audit_logs`, menghambat deteksi.
- **Dampak:** aktivitas berbahaya tidak terpantau; investigasi insiden sulit.
- **Perbaikan:** catat `login_gagal` (username yang dicoba, IP, waktu) ke
  `audit_logs`, dan pasang peringatan saat banyak kegagalan beruntun.

## V8 — A10 Mishandling of Exceptional Conditions (pesan error membocorkan detail) · tema K/M (pendukung)

- **Lokasi:** `main.py` baris ~104–115, handler `tangani_error`. Saat `DEBUG`
  aktif, respons 500 menyertakan `error`, `type`, `path`, teks **query SQL**
  (`exc.cursor.query`), dan `trace` (stack trace penuh).
- **Masalah:** kondisi error ditangani dengan membeberkan detail internal ke klien.
- **Cara eksploitasi:** kirim input yang memicu error database (mis. kutip tunggal
  tak seimbang saat menyelidiki V4). Respons memperlihatkan query asli dan jejak
  kode, mempercepat penyusunan payload injeksi serta pemetaan skema.
- **Dampak:** mempermudah eksploitasi V4 (kebocoran struktur query/tabel soal) dan
  pengungkapan informasi sensitif.
- **Perbaikan:** di luar pengembangan, kembalikan pesan generik; catat detail
  hanya ke log server, jangan ke respons.

---

## Bagian yang sengaja dibuat benar (pembanding)

- **A03 Software Supply Chain Failures — aman:** dependensi dikunci versinya di
  `requirements.txt`, hanya pustaka umum dari PyPI, tanpa sumber tak tepercaya.
- **A08 Software or Data Integrity Failures — aman:** skor dihitung di server dari
  `options.is_correct` (`hitung_skor`), bukan dari data klien; jawaban divalidasi
  agar soal milik ujian terkait dan pilihan milik soal terkait; pemisahan peran
  ditegakkan server lewat `require_role` pada seluruh endpoint dosen; `is_correct`
  tidak pernah dikirim ke mahasiswa pada `GET /api/sesi/{id}`.
- Pengecekan kepemilikan sudah benar pada endpoint mahasiswa lain (`/api/sesi/{id}`,
  `/jawab`, `/kirim`, `/mulai`) yang memfilter `student_id = user.id`; hanya
  `/api/hasil/{id}` (V1) yang sengaja dibiarkan bocor.

## Peta tema

| Tema | Kerentanan terkait |
|------|--------------------|
| Kebocoran soal / kunci jawaban | V1 (kunci via IDOR), V8 (struktur query), didukung V2 |
| Manipulasi nilai | V1 (baca nilai), V4 (bypass jadi dosen), V5 (waktu tak terbatas), V6+V3 (ambil alih akun dosen), V7 (tanpa jejak) |
