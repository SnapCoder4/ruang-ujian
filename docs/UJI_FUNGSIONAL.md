# Pengujian Fungsional (Blackbox) - Ruang Ujian

Kolom **Hasil** dikosongkan untuk diisi saat pelaksanaan pengujian.

## 1. Autentikasi

| No | Skenario | Masukan | Hasil yang diharapkan | Hasil |
|----|----------|---------|------------------------|-------|
| F-01 | Login mahasiswa valid | `andi` / `password123` | Diarahkan ke beranda mahasiswa | |
| F-02 | Login dosen valid | `dosen.rina` / `password123` | Diarahkan ke ruang dosen | |
| F-03 | Login sandi salah | `andi` / `salah` | Pesan "Username atau sandi salah" | |
| F-04 | Login username kosong | kosong | Validasi klien menolak submit | |
| F-05 | Keluar | klik Keluar | Sesi berakhir, kembali ke halaman masuk | |
| F-06 | Ganti sandi valid | sandi lama benar + baru ≥8 | Notifikasi berhasil | |
| F-07 | Ganti sandi lama salah | sandi lama salah | Pesan "Sandi lama tidak cocok" | |
| F-08 | Akses halaman tanpa login | buka `/mahasiswa` langsung | Dialihkan ke halaman sesi habis | |

## 2. Mengerjakan Ujian (Mahasiswa)

| No | Skenario | Masukan | Hasil yang diharapkan | Hasil |
|----|----------|---------|------------------------|-------|
| F-09 | Lihat jadwal ujian | buka beranda | Daftar ujian terpublikasi tampil | |
| F-10 | Mulai ujian | klik "Mulai ujian" | Masuk ruang ujian, timer berjalan | |
| F-11 | Lanjutkan ujian berjalan | mulai lagi ujian sama | Kembali ke sesi yang sama | |
| F-12 | Pilih jawaban | klik gelembung A-D | Jawaban tersimpan, navigasi menandai terisi | |
| F-13 | Navigasi soal | klik nomor di panel | Pindah ke soal terkait | |
| F-14 | Kirim ujian | klik "Kirim ujian" | Dialog konfirmasi, lalu nilai muncul | |
| F-15 | Timer habis | tunggu 00:00 | Jawaban terkirim otomatis | |
| F-16 | Buka ujian yang sudah dikirim | klik ujian selesai | Tidak bisa dikerjakan ulang | |
| F-17 | Lihat rincian nilai | klik "Rincian" | Tabel benar/salah per nomor | |

## 3. Pengawasan & Peringatan

| No | Skenario | Masukan | Hasil yang diharapkan | Hasil |
|----|----------|---------|------------------------|-------|
| F-18 | Pindah tab saat ujian | ganti tab browser | Peringatan tingkat rendah tercatat | |
| F-19 | Keluar layar penuh | keluar fullscreen | Peringatan tingkat sedang tercatat | |
| F-20 | Dosen lihat log peringatan | buka log peringatan | Daftar peringatan dengan tingkat | |
| F-21 | Saring peringatan per tingkat | klik "Tinggi" | Hanya peringatan tinggi tampil | |

## 4. Dosen: Ujian, Soal, Nilai

| No | Skenario | Masukan | Hasil yang diharapkan | Hasil |
|----|----------|---------|------------------------|-------|
| F-22 | Buat ujian | isi form ujian | Ujian baru muncul di daftar | |
| F-23 | Buat ujian waktu salah | selesai < mulai | Ditolak dengan pesan | |
| F-24 | Tambah soal | 4 pilihan + 1 kunci | Soal tersimpan | |
| F-25 | Tambah soal tanpa kunci | tidak tandai benar | Ditolak "tepat satu jawaban benar" | |
| F-26 | Tambah soal kurang pilihan | hanya 3 pilihan diisi | Ditolak | |
| F-27 | Ubah soal | edit isi/pilihan | Perubahan tersimpan | |
| F-28 | Hapus soal | klik hapus + konfirmasi | Soal terhapus | |
| F-29 | Pantau status mahasiswa | pilih ujian | Status & nilai per mahasiswa | |
| F-30 | Ubah nilai manual | nilai + alasan | Nilai berubah, tercatat di audit | |
| F-31 | Ubah nilai tanpa alasan | alasan kosong | Ditolak | |
| F-32 | Lihat catatan aktivitas | buka audit | Perubahan nilai & login tercatat | |

## 5. Antarmuka & Aksesibilitas

| No | Skenario | Masukan | Hasil yang diharapkan | Hasil |
|----|----------|---------|------------------------|-------|
| F-33 | Ganti tema | klik tombol tema | Mode terang/gelap berganti & tersimpan | |
| F-34 | Tema ikut sistem | buka pertama kali | Mengikuti prefers-color-scheme | |
| F-35 | Navigasi keyboard | Tab ke seluruh kontrol | Fokus terlihat, urutan logis | |
| F-36 | Responsif HP | lebar 375px | Layout tetap terbaca, tanpa scroll horizontal | |
