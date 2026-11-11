# Ruang Ujian

Sistem ujian online kampus untuk latihan mata kuliah **Secure Applications Development**.
Dibangun dengan FastAPI + PostgreSQL + HTML/CSS/JS murni. Dijalankan di localhost,
seluruh data bersifat **fiktif**.

Judul proyek: *Mengamankan Aplikasi Ujian Online dari Kebocoran Soal dan Manipulasi Nilai*.

## Fitur

- **Mahasiswa:** lihat jadwal, mengerjakan ujian (timer, navigasi soal, jawaban
  tersimpan otomatis, kirim), lihat nilai dan rincian, ganti sandi.
- **Dosen:** buat/ubah ujian, kelola bank soal, pantau status mahasiswa, ubah nilai
  manual dengan alasan, lihat log peringatan, lihat catatan aktivitas, ganti sandi.
- Satu form login, peran ditentukan server.
- Mode terang/gelap, responsif sampai lebar HP, ikon SVG, motif lembar jawaban (LJK).

## Prasyarat

- Python 3.10+
- PostgreSQL 13+

## Menjalankan di localhost

### 1. Siapkan database PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER ruang_ujian WITH PASSWORD 'ruang_ujian';
CREATE DATABASE ruang_ujian OWNER ruang_ujian;
SQL
```

### 2. Buat tabel dan isi data awal

```bash
psql "postgresql://ruang_ujian:ruang_ujian@localhost:5432/ruang_ujian" -f sql/schema.sql
psql "postgresql://ruang_ujian:ruang_ujian@localhost:5432/ruang_ujian" -f sql/seed.sql
```

### 3. Pasang dependensi Python

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Jalankan server

```bash
uvicorn main:app --host 127.0.0.1
```

Buka http://127.0.0.1:8000 di peramban.

> Koneksi database memakai variabel lingkungan `DATABASE_URL`. Jika kredensial
> berbeda, setel sebelum menjalankan:
> `export DATABASE_URL="postgresql://user:pass@localhost:5432/namadb"`

## Akun fiktif

Semua akun memakai sandi: **`password123`**

| Peran | Nama pengguna | Nama lengkap |
|-------|---------------|--------------|
| Dosen | `dosen.rina` | Rina Kusumawati, M.Kom. |
| Mahasiswa | `andi` | Andi Pratama |
| Mahasiswa | `budi` | Budi Santoso |
| Mahasiswa | `citra` | Citra Dewi Lestari |
| Mahasiswa | `dewi` | Dewi Anggraini |

Data awal berisi 1 mata kuliah (IF301 Basis Data), 1 ujian (*UTS Basis Data*,
60 menit, sedang berlangsung) dengan 10 soal pilihan ganda. Mahasiswa *Citra*
sudah memiliki satu sesi selesai beserta contoh log peringatan.

## Struktur proyek

```
main.py            # FastAPI: endpoint API + routing halaman + StaticFiles
db.py              # koneksi psycopg2
auth.py            # sandi, token sesi, kontrol peran
sql/               # schema.sql, seed.sql
static/            # halaman HTML, CSS, JS (frontend)
docs/              # ERD, use case, uji fungsional, checklist OWASP
```

## Dokumen pendukung (folder `docs/`)

- `ERD.md` - Entity Relationship Diagram (Mermaid)
- `USECASE.md` - Use case diagram (Mermaid)
- `UJI_FUNGSIONAL.md` - rencana uji blackbox
- `CHECKLIST_OWASP.md` - checklist evaluasi OWASP Top 10:2025
