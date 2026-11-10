-- Ruang Ujian — data awal fiktif
-- Semua akun memakai sandi: password123

INSERT INTO users (id, username, password_hash, full_name, role, nim_nip) VALUES
    (1, 'dosen.rina', '482c811da5d5b4bc6d497ffa98491e38', 'Rina Kusumawati, M.Kom.', 'dosen',     '198504122010122001'),
    (2, 'andi',       '482c811da5d5b4bc6d497ffa98491e38', 'Andi Pratama',            'mahasiswa', '2210101001'),
    (3, 'budi',       '482c811da5d5b4bc6d497ffa98491e38', 'Budi Santoso',            'mahasiswa', '2210101002'),
    (4, 'citra',      '482c811da5d5b4bc6d497ffa98491e38', 'Citra Dewi Lestari',      'mahasiswa', '2210101003'),
    (5, 'dewi',       '482c811da5d5b4bc6d497ffa98491e38', 'Dewi Anggraini',          'mahasiswa', '2210101004');
SELECT setval('users_id_seq', 5);

INSERT INTO courses (id, code, name, lecturer_id) VALUES
    (1, 'IF301', 'Basis Data', 1);
SELECT setval('courses_id_seq', 1);

INSERT INTO exams (id, course_id, title, starts_at, ends_at, duration_minutes, is_published, created_by) VALUES
    (1, 1, 'UTS Basis Data', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days', 60, TRUE, 1);
SELECT setval('exams_id_seq', 1);

INSERT INTO questions (id, exam_id, number, body) VALUES
    (1,  1, 1,  'Perintah SQL yang digunakan untuk mengambil data dari satu atau lebih tabel adalah ...'),
    (2,  1, 2,  'Kunci yang mengidentifikasi setiap baris secara unik dalam sebuah tabel disebut ...'),
    (3,  1, 3,  'Bentuk normal yang mensyaratkan setiap atribut non-kunci bergantung penuh pada seluruh primary key (bukan sebagian) adalah ...'),
    (4,  1, 4,  'Klausa SQL yang dipakai untuk menyaring baris SEBELUM proses pengelompokan (GROUP BY) adalah ...'),
    (5,  1, 5,  'Jenis JOIN yang mengembalikan semua baris dari tabel kiri beserta pasangan yang cocok dari tabel kanan adalah ...'),
    (6,  1, 6,  'Dalam diagram ER, simbol belah ketupat (diamond) melambangkan ...'),
    (7,  1, 7,  'Sifat transaksi yang menjamin seluruh operasi dijalankan semua atau tidak sama sekali adalah ...'),
    (8,  1, 8,  'Kolom pada sebuah tabel yang merujuk ke primary key tabel lain disebut ...'),
    (9,  1, 9,  'Perintah untuk menghapus seluruh struktur tabel beserta datanya dari basis data adalah ...'),
    (10, 1, 10, 'Struktur data yang dipakai basis data untuk mempercepat pencarian baris berdasarkan nilai kolom tertentu adalah ...');
SELECT setval('questions_id_seq', 10);

INSERT INTO options (question_id, label, body, is_correct) VALUES
    (1, 'A', 'INSERT',  FALSE), (1, 'B', 'SELECT',  TRUE),  (1, 'C', 'UPDATE', FALSE), (1, 'D', 'ALTER', FALSE),
    (2, 'A', 'Foreign key', FALSE), (2, 'B', 'Candidate key', FALSE), (2, 'C', 'Primary key', TRUE), (2, 'D', 'Super key', FALSE),
    (3, 'A', '1NF', FALSE), (3, 'B', '2NF', TRUE), (3, 'C', '3NF', FALSE), (3, 'D', 'BCNF', FALSE),
    (4, 'A', 'HAVING', FALSE), (4, 'B', 'ORDER BY', FALSE), (4, 'C', 'LIMIT', FALSE), (4, 'D', 'WHERE', TRUE),
    (5, 'A', 'INNER JOIN', FALSE), (5, 'B', 'LEFT JOIN', TRUE), (5, 'C', 'CROSS JOIN', FALSE), (5, 'D', 'RIGHT JOIN', FALSE),
    (6, 'A', 'Entitas', FALSE), (6, 'B', 'Atribut', FALSE), (6, 'C', 'Relasi', TRUE), (6, 'D', 'Kardinalitas', FALSE),
    (7, 'A', 'Atomicity', TRUE), (7, 'B', 'Consistency', FALSE), (7, 'C', 'Isolation', FALSE), (7, 'D', 'Durability', FALSE),
    (8, 'A', 'Primary key', FALSE), (8, 'B', 'Unique key', FALSE), (8, 'C', 'Composite key', FALSE), (8, 'D', 'Foreign key', TRUE),
    (9, 'A', 'DELETE FROM', FALSE), (9, 'B', 'TRUNCATE', FALSE), (9, 'C', 'DROP TABLE', TRUE), (9, 'D', 'REMOVE', FALSE),
    (10, 'A', 'View', FALSE), (10, 'B', 'Index', TRUE), (10, 'C', 'Trigger', FALSE), (10, 'D', 'Sequence', FALSE);

-- Satu sesi contoh yang sudah selesai (Citra) agar halaman dosen tidak kosong
INSERT INTO exam_sessions (id, exam_id, student_id, started_at, deadline_at, submitted_at, score, status) VALUES
    (1, 1, 4, NOW() - INTERVAL '50 minutes', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', 80.00, 'selesai');
SELECT setval('exam_sessions_id_seq', 1);

INSERT INTO answers (session_id, question_id, option_id)
SELECT 1, q.id, o.id
FROM questions q
JOIN options o ON o.question_id = q.id
WHERE q.exam_id = 1
  AND ((q.number NOT IN (4, 9) AND o.is_correct)
    OR (q.number = 4 AND o.label = 'A')
    OR (q.number = 9 AND o.label = 'B'));

INSERT INTO warning_logs (session_id, level, event, detail, created_at) VALUES
    (1, 'rendah', 'pindah_tab',         'Jendela ujian kehilangan fokus selama 4 detik', NOW() - INTERVAL '40 minutes'),
    (1, 'sedang', 'keluar_layar_penuh', 'Mode layar penuh ditinggalkan',                 NOW() - INTERVAL '30 minutes'),
    (1, 'tinggi', 'dua_perangkat',      'Sesi dibuka dari perangkat lain',               NOW() - INTERVAL '20 minutes');

INSERT INTO audit_logs (user_id, action, detail, ip, created_at) VALUES
    (1, 'login_sukses', 'dosen.rina masuk',                      '127.0.0.1', NOW() - INTERVAL '1 day'),
    (1, 'buat_ujian',   'Ujian "UTS Basis Data" dibuat (id=1)',  '127.0.0.1', NOW() - INTERVAL '1 day'),
    (4, 'login_sukses', 'citra masuk',                           '127.0.0.1', NOW() - INTERVAL '50 minutes'),
    (4, 'kirim_ujian',  'Sesi 1 dikirim, skor 80.00',            '127.0.0.1', NOW() - INTERVAL '5 minutes');
