# Checklist Evaluasi OWASP Top 10:2025 — Ruang Ujian

Evaluasi keamanan dijalankan di localhost. Fokus utama dua risiko tugas:
**kebocoran soal/kunci jawaban** dan **manipulasi nilai**.
Kolom **Hasil** dan **Bukti** dikosongkan untuk diisi saat pengujian.

| Kode | Kategori | Skenario uji | Alat | Hasil | Bukti |
|------|----------|--------------|------|-------|-------|
| A01 | Broken Access Control | Akses hasil/ujian/sesi milik pengguna lain dengan mengganti ID; akses endpoint dosen memakai akun mahasiswa | Browser DevTools, Burp Suite, curl | | |
| A02 | Security Misconfiguration | Periksa mode debug framework, header keamanan, dan konfigurasi default yang terbuka | Browser, curl, nikto | | |
| A03 | Software Supply Chain Failures | Periksa asal & integritas dependensi, versi terpasang, dan lockfile | pip-audit, review requirements | | |
| A04 | Cryptographic Failures | Periksa cara penyimpanan sandi dan token sesi di database | psql, review kode | | |
| A05 | Injection | Uji input login & parameter lain untuk SQL injection | sqlmap, Burp Suite | | |
| A06 | Insecure Design | Uji apakah batas waktu & skor dapat dilewati dari sisi klien; alur bisnis ujian | Burp Suite, review alur | | |
| A07 | Authentication Failures | Uji brute force login, kekuatan hash sandi, masa berlaku sesi | Hydra, Burp Intruder | | |
| A08 | Software or Data Integrity Failures | Periksa integritas data yang dipercaya dari klien (skor, waktu) dan proses update | Burp Suite, review manual | | |
| A09 | Logging & Alerting Failures | Periksa apakah login gagal & perubahan penting tercatat lengkap | review audit_logs | | |
| A10 | Mishandling of Exceptional Conditions | Picu error server dan amati apakah detail teknis (query, stack trace) bocor ke respons | Browser, curl | | |

> Catatan: penomoran dan nama kategori mengikuti rilis OWASP Top 10:2025.
> Isi hasil dengan **Rentan / Aman / Tidak berlaku** beserta tingkat keparahan,
> dan lampirkan bukti (tangkapan layar, permintaan/respons HTTP, kueri).
