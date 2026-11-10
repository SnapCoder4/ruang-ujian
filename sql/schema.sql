-- Ruang Ujian — skema database PostgreSQL
-- Jalankan: psql -U ruang_ujian -d ruang_ujian -f sql/schema.sql

DROP TABLE IF EXISTS sessions, audit_logs, warning_logs, answers, exam_sessions,
    options, questions, exams, courses, users CASCADE;

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash CHAR(32) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('mahasiswa', 'dosen')),
    nim_nip       VARCHAR(30),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE exams (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title            VARCHAR(150) NOT NULL,
    starts_at        TIMESTAMPTZ NOT NULL,
    ends_at          TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 300),
    is_published     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
    id         SERIAL PRIMARY KEY,
    exam_id    INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    number     INTEGER NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exam_id, number)
);

CREATE TABLE options (
    id          SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label       CHAR(1) NOT NULL CHECK (label IN ('A', 'B', 'C', 'D')),
    body        TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, label)
);

CREATE TABLE exam_sessions (
    id           SERIAL PRIMARY KEY,
    exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at  TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    score        NUMERIC(5,2),
    status       VARCHAR(20) NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan', 'selesai')),
    client_token CHAR(64),
    UNIQUE (exam_id, student_id)
);

CREATE TABLE answers (
    id          SERIAL PRIMARY KEY,
    session_id  INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_id   INTEGER REFERENCES options(id) ON DELETE SET NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, question_id)
);

CREATE TABLE warning_logs (
    id         SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    level      VARCHAR(10) NOT NULL CHECK (level IN ('rendah', 'sedang', 'tinggi')),
    event      VARCHAR(50) NOT NULL,
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(50) NOT NULL,
    detail     TEXT,
    ip         VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    token      CHAR(64) PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user   ON sessions(user_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_warning_session ON warning_logs(session_id);
CREATE INDEX idx_audit_created   ON audit_logs(created_at DESC);
