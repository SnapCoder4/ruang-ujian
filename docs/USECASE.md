# Use Case Diagram — Ruang Ujian

Dua aktor: **Mahasiswa** dan **Dosen**. Peran ditentukan server berdasarkan akun.

```mermaid
flowchart LR
    mahasiswa(["Mahasiswa"])
    dosen(["Dosen"])

    subgraph Sistem["Ruang Ujian"]
        UC1(["Masuk / Keluar"])
        UC2(["Ganti sandi"])
        UC3(["Lihat jadwal ujian"])
        UC4(["Mengerjakan ujian"])
        UC5(["Menyimpan jawaban otomatis"])
        UC6(["Mengirim ujian"])
        UC7(["Lihat nilai & rincian"])
        UC8(["Buat / ubah ujian"])
        UC9(["Kelola bank soal"])
        UC10(["Pantau status mahasiswa"])
        UC11(["Ubah nilai manual + alasan"])
        UC12(["Lihat log peringatan"])
        UC13(["Lihat catatan aktivitas"])
    end

    mahasiswa --- UC1
    mahasiswa --- UC2
    mahasiswa --- UC3
    mahasiswa --- UC4
    mahasiswa --- UC7
    UC4 -. include .-> UC5
    UC4 -. include .-> UC6

    dosen --- UC1
    dosen --- UC2
    dosen --- UC8
    dosen --- UC9
    dosen --- UC10
    dosen --- UC11
    dosen --- UC12
    dosen --- UC13
    UC11 -. include .-> UC13
```

## Ringkasan use case

| Kode | Use case | Aktor | Keterangan |
|------|----------|-------|------------|
| UC1  | Masuk / Keluar | Mahasiswa, Dosen | Autentikasi berbasis token sesi di cookie |
| UC2  | Ganti sandi | Mahasiswa, Dosen | Perlu sandi lama |
| UC3  | Lihat jadwal ujian | Mahasiswa | Jadwal yang dipublikasikan |
| UC4  | Mengerjakan ujian | Mahasiswa | Timer, navigasi soal, pilihan jawaban |
| UC5  | Simpan jawaban otomatis | Mahasiswa | Tiap pilihan langsung dikirim |
| UC6  | Mengirim ujian | Mahasiswa | Skor dihitung server |
| UC7  | Lihat nilai & rincian | Mahasiswa | Benar/salah per nomor |
| UC8  | Buat / ubah ujian | Dosen | Jadwal, durasi, publikasi |
| UC9  | Kelola bank soal | Dosen | Tambah/ubah/hapus soal, 4 pilihan 1 kunci |
| UC10 | Pantau status mahasiswa | Dosen | Belum mulai / berjalan / selesai |
| UC11 | Ubah nilai manual | Dosen | Wajib alasan, tercatat di audit |
| UC12 | Lihat log peringatan | Dosen | Tingkat rendah/sedang/tinggi |
| UC13 | Lihat catatan aktivitas | Dosen | Audit log aktivitas sistem |
