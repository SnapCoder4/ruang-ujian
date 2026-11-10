import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg2
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from auth import (
    COOKIE_NAME,
    SESSION_HOURS,
    create_session,
    current_user,
    destroy_session,
    hash_password,
    require_role,
    write_audit,
)
from db import DEBUG, get_conn

app = FastAPI(title="Ruang Ujian", debug=DEBUG)
STATIC_DIR = Path(__file__).parent / "static"


class LoginIn(BaseModel):
    username: str
    password: str


class GantiSandiIn(BaseModel):
    sandi_lama: str
    sandi_baru: str = Field(min_length=8, max_length=72)


class JawabIn(BaseModel):
    question_id: int
    option_id: int | None = None


class PeringatanIn(BaseModel):
    event: str = Field(pattern="^(pindah_tab|keluar_layar_penuh)$")
    detail: str | None = Field(default=None, max_length=200)


class UjianIn(BaseModel):
    course_id: int
    title: str = Field(min_length=3, max_length=150)
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int = Field(ge=5, le=300)
    is_published: bool = False


class PilihanIn(BaseModel):
    label: str = Field(pattern="^[ABCD]$")
    body: str = Field(min_length=1, max_length=500)
    is_correct: bool = False


class SoalIn(BaseModel):
    number: int = Field(ge=1, le=200)
    body: str = Field(min_length=5, max_length=2000)
    options: list[PilihanIn]


class NilaiIn(BaseModel):
    score: float = Field(ge=0, le=100)
    alasan: str = Field(min_length=5, max_length=300)


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def validasi_pilihan(options: list[PilihanIn]) -> None:
    labels = sorted(o.label for o in options)
    if labels != ["A", "B", "C", "D"]:
        raise HTTPException(400, "Soal harus memiliki tepat 4 pilihan A, B, C, D")
    if sum(1 for o in options if o.is_correct) != 1:
        raise HTTPException(400, "Tepat satu pilihan harus ditandai sebagai jawaban benar")


def hitung_skor(cur, session_id: int) -> float:
    cur.execute(
        """
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE o.is_correct) AS benar
        FROM exam_sessions es
        JOIN questions q ON q.exam_id = es.exam_id
        LEFT JOIN answers a ON a.session_id = es.id AND a.question_id = q.id
        LEFT JOIN options o ON o.id = a.option_id
        WHERE es.id = %s
        """,
        (session_id,),
    )
    row = cur.fetchone()
    if not row["total"]:
        return 0.0
    return round(row["benar"] * 100.0 / row["total"], 2)


@app.exception_handler(Exception)
async def tangani_error(request: Request, exc: Exception):
    body = {"detail": "Terjadi kesalahan di server"}
    if DEBUG:
        body["error"] = str(exc)
        body["type"] = type(exc).__name__
        body["path"] = str(request.url)
        if isinstance(exc, psycopg2.Error) and exc.cursor is not None and exc.cursor.query:
            body["query"] = exc.cursor.query.decode(errors="replace")
        body["trace"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=body)


@app.post("/api/login")
def login(data: LoginIn, request: Request, response: Response):
    username = data.username.strip()
    pw_hash = hash_password(data.password)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT id, username, role FROM users "
            f"WHERE username = '{username}' AND password_hash = '{pw_hash}'"
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(401, "Username atau sandi salah")
        token = create_session(conn, user["id"], request.headers.get("user-agent"))
        write_audit(conn, user["id"], "login_sukses", f"{user['username']} masuk", client_ip(request))
    response.set_cookie(
        COOKIE_NAME, token,
        max_age=SESSION_HOURS * 3600, httponly=True, samesite="lax", path="/",
    )
    return {"role": user["role"], "username": user["username"]}


@app.post("/api/logout")
def logout(request: Request, response: Response, user: dict = Depends(current_user)):
    with get_conn() as conn:
        destroy_session(conn, user["token"])
        write_audit(conn, user["id"], "logout", f"{user['username']} keluar", client_ip(request))
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/me")
def me(user: dict = Depends(current_user)):
    return {k: user[k] for k in ("id", "username", "full_name", "role", "nim_nip")}


@app.post("/api/ganti-sandi")
def ganti_sandi(data: GantiSandiIn, request: Request, user: dict = Depends(current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user["id"],))
        row = cur.fetchone()
        if row["password_hash"] != hash_password(data.sandi_lama):
            raise HTTPException(400, "Sandi lama tidak cocok")
        if data.sandi_lama == data.sandi_baru:
            raise HTTPException(400, "Sandi baru harus berbeda dari sandi lama")
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hash_password(data.sandi_baru), user["id"]),
        )
        cur.execute(
            "DELETE FROM sessions WHERE user_id = %s AND token <> %s",
            (user["id"], user["token"]),
        )
        write_audit(conn, user["id"], "ganti_sandi", f"{user['username']} mengganti sandi", client_ip(request))
    return {"ok": True}


@app.get("/api/ujian")
def daftar_ujian(user: dict = Depends(require_role("mahasiswa"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.title, e.starts_at, e.ends_at, e.duration_minutes,
                   c.code AS course_code, c.name AS course_name,
                   u.full_name AS lecturer,
                   (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS jumlah_soal,
                   es.id AS session_id, es.status, es.score, es.deadline_at, es.submitted_at,
                   NOW() AS server_now
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            LEFT JOIN users u ON u.id = c.lecturer_id
            LEFT JOIN exam_sessions es ON es.exam_id = e.id AND es.student_id = %s
            WHERE e.is_published
            ORDER BY e.starts_at DESC
            """,
            (user["id"],),
        )
        return cur.fetchall()


@app.post("/api/ujian/{exam_id}/mulai")
def mulai_ujian(exam_id: int, request: Request, user: dict = Depends(require_role("mahasiswa"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, duration_minutes, starts_at, ends_at, is_published FROM exams WHERE id = %s",
            (exam_id,),
        )
        exam = cur.fetchone()
        if not exam or not exam["is_published"]:
            raise HTTPException(404, "Ujian tidak ditemukan")
        now = datetime.now(timezone.utc)
        if now > exam["ends_at"]:
            raise HTTPException(400, "Jadwal ujian sudah berakhir")

        cur.execute(
            "SELECT id, status FROM exam_sessions WHERE exam_id = %s AND student_id = %s",
            (exam_id, user["id"]),
        )
        existing = cur.fetchone()
        if existing:
            if existing["status"] == "selesai":
                raise HTTPException(400, "Ujian ini sudah dikirim")
            return {"session_id": existing["id"], "lanjut": True}

        deadline = min(now + timedelta(minutes=exam["duration_minutes"]), exam["ends_at"])
        cur.execute(
            """
            INSERT INTO exam_sessions (exam_id, student_id, deadline_at, client_token)
            VALUES (%s, %s, %s, %s) RETURNING id
            """,
            (exam_id, user["id"], deadline, user["token"]),
        )
        session_id = cur.fetchone()["id"]
        write_audit(conn, user["id"], "mulai_ujian", f"Sesi {session_id} dimulai (ujian {exam_id})", client_ip(request))
    return {"session_id": session_id, "lanjut": False}


@app.get("/api/sesi/{session_id}")
def detail_sesi(session_id: int, user: dict = Depends(require_role("mahasiswa"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT es.id, es.exam_id, es.student_id, es.deadline_at, es.status, es.client_token,
                   e.title, e.duration_minutes, c.code AS course_code, c.name AS course_name,
                   NOW() AS server_now
            FROM exam_sessions es
            JOIN exams e ON e.id = es.exam_id
            JOIN courses c ON c.id = e.course_id
            WHERE es.id = %s AND es.student_id = %s
            """,
            (session_id, user["id"]),
        )
        ses = cur.fetchone()
        if not ses:
            raise HTTPException(404, "Sesi tidak ditemukan")
        if ses["status"] == "selesai":
            raise HTTPException(400, "Sesi sudah selesai")

        if ses["client_token"] and ses["client_token"] != user["token"]:
            cur.execute(
                "INSERT INTO warning_logs (session_id, level, event, detail) "
                "VALUES (%s, 'tinggi', 'dua_perangkat', 'Sesi dibuka dari login lain')",
                (session_id,),
            )

        cur.execute(
            """
            SELECT q.id, q.number, q.body,
                   json_agg(json_build_object('id', o.id, 'label', o.label, 'body', o.body)
                            ORDER BY o.label) AS options
            FROM questions q
            JOIN options o ON o.question_id = q.id
            WHERE q.exam_id = %s
            GROUP BY q.id
            ORDER BY q.number
            """,
            (ses["exam_id"],),
        )
        soal = cur.fetchall()

        cur.execute("SELECT question_id, option_id FROM answers WHERE session_id = %s", (session_id,))
        jawaban = {r["question_id"]: r["option_id"] for r in cur.fetchall()}

    return {
        "session_id": ses["id"],
        "title": ses["title"],
        "course": f'{ses["course_code"]} {ses["course_name"]}',
        "deadline_at": ses["deadline_at"],
        "server_now": ses["server_now"],
        "questions": soal,
        "answers": jawaban,
    }


@app.put("/api/sesi/{session_id}/jawab")
def simpan_jawaban(session_id: int, data: JawabIn, user: dict = Depends(require_role("mahasiswa"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT exam_id, status FROM exam_sessions WHERE id = %s AND student_id = %s",
            (session_id, user["id"]),
        )
        ses = cur.fetchone()
        if not ses:
            raise HTTPException(404, "Sesi tidak ditemukan")
        if ses["status"] == "selesai":
            raise HTTPException(400, "Sesi sudah selesai")

        cur.execute(
            "SELECT 1 FROM questions WHERE id = %s AND exam_id = %s",
            (data.question_id, ses["exam_id"]),
        )
        if not cur.fetchone():
            raise HTTPException(400, "Soal tidak termasuk dalam ujian ini")
        if data.option_id is not None:
            cur.execute(
                "SELECT 1 FROM options WHERE id = %s AND question_id = %s",
                (data.option_id, data.question_id),
            )
            if not cur.fetchone():
                raise HTTPException(400, "Pilihan tidak valid untuk soal ini")

        cur.execute(
            """
            INSERT INTO answers (session_id, question_id, option_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (session_id, question_id)
            DO UPDATE SET option_id = EXCLUDED.option_id, answered_at = NOW()
            """,
            (session_id, data.question_id, data.option_id),
        )
    return {"ok": True}


@app.post("/api/sesi/{session_id}/kirim")
def kirim_ujian(session_id: int, request: Request, user: dict = Depends(require_role("mahasiswa"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT status FROM exam_sessions WHERE id = %s AND student_id = %s",
            (session_id, user["id"]),
        )
        ses = cur.fetchone()
        if not ses:
            raise HTTPException(404, "Sesi tidak ditemukan")
        if ses["status"] == "selesai":
            raise HTTPException(400, "Sesi sudah dikirim")

        skor = hitung_skor(cur, session_id)
        cur.execute(
            "UPDATE exam_sessions SET status = 'selesai', submitted_at = NOW(), score = %s WHERE id = %s",
            (skor, session_id),
        )
        write_audit(conn, user["id"], "kirim_ujian", f"Sesi {session_id} dikirim, skor {skor}", client_ip(request))
    return {"ok": True, "score": skor}


@app.post("/api/sesi/{session_id}/peringatan")
def lapor_peringatan(session_id: int, data: PeringatanIn, user: dict = Depends(require_role("mahasiswa"))):
    level = "rendah" if data.event == "pindah_tab" else "sedang"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM exam_sessions WHERE id = %s AND student_id = %s",
            (session_id, user["id"]),
        )
        if not cur.fetchone():
            raise HTTPException(404, "Sesi tidak ditemukan")
        cur.execute(
            "INSERT INTO warning_logs (session_id, level, event, detail) VALUES (%s, %s, %s, %s)",
            (session_id, level, data.event, data.detail),
        )
    return {"ok": True}


@app.get("/api/hasil/{session_id}")
def hasil_ujian(session_id: int, user: dict = Depends(current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT es.id, es.score, es.status, es.submitted_at,
                   e.title, u.full_name AS student_name,
                   c.code AS course_code, c.name AS course_name
            FROM exam_sessions es
            JOIN exams e ON e.id = es.exam_id
            JOIN users u ON u.id = es.student_id
            JOIN courses c ON c.id = e.course_id
            WHERE es.id = %s
            """,
            (session_id,),
        )
        ses = cur.fetchone()
        if not ses:
            raise HTTPException(404, "Hasil tidak ditemukan")

        cur.execute(
            """
            SELECT q.number, q.body,
                   a.option_id AS jawaban_id,
                   (SELECT label FROM options WHERE id = a.option_id) AS jawaban_label,
                   co.label AS kunci_label,
                   (a.option_id = co.id) AS benar
            FROM questions q
            LEFT JOIN answers a ON a.session_id = %s AND a.question_id = q.id
            LEFT JOIN options co ON co.question_id = q.id AND co.is_correct
            JOIN exam_sessions es ON es.id = %s
            WHERE q.exam_id = es.exam_id
            ORDER BY q.number
            """,
            (session_id, session_id),
        )
        rincian = cur.fetchall()
    return {
        "session_id": ses["id"],
        "title": ses["title"],
        "course": f'{ses["course_code"]} {ses["course_name"]}',
        "student_name": ses["student_name"],
        "score": ses["score"],
        "status": ses["status"],
        "submitted_at": ses["submitted_at"],
        "rincian": rincian,
    }


@app.get("/api/dosen/ujian")
def dosen_daftar_ujian(user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.title, e.starts_at, e.ends_at, e.duration_minutes, e.is_published,
                   c.code AS course_code, c.name AS course_name,
                   (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS jumlah_soal
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            ORDER BY e.created_at DESC
            """
        )
        return cur.fetchall()


@app.get("/api/dosen/courses")
def dosen_courses(user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, code, name FROM courses ORDER BY code")
        return cur.fetchall()


@app.post("/api/dosen/ujian")
def dosen_buat_ujian(data: UjianIn, request: Request, user: dict = Depends(require_role("dosen"))):
    if data.ends_at <= data.starts_at:
        raise HTTPException(400, "Waktu selesai harus setelah waktu mulai")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM courses WHERE id = %s", (data.course_id,))
        if not cur.fetchone():
            raise HTTPException(400, "Mata kuliah tidak ditemukan")
        cur.execute(
            """
            INSERT INTO exams (course_id, title, starts_at, ends_at, duration_minutes, is_published, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """,
            (data.course_id, data.title, data.starts_at, data.ends_at,
             data.duration_minutes, data.is_published, user["id"]),
        )
        exam_id = cur.fetchone()["id"]
        write_audit(conn, user["id"], "buat_ujian", f'Ujian "{data.title}" dibuat (id={exam_id})', client_ip(request))
    return {"id": exam_id}


@app.put("/api/dosen/ujian/{exam_id}")
def dosen_ubah_ujian(exam_id: int, data: UjianIn, request: Request, user: dict = Depends(require_role("dosen"))):
    if data.ends_at <= data.starts_at:
        raise HTTPException(400, "Waktu selesai harus setelah waktu mulai")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM exams WHERE id = %s", (exam_id,))
        if not cur.fetchone():
            raise HTTPException(404, "Ujian tidak ditemukan")
        cur.execute(
            """
            UPDATE exams SET title = %s, starts_at = %s, ends_at = %s,
                   duration_minutes = %s, is_published = %s
            WHERE id = %s
            """,
            (data.title, data.starts_at, data.ends_at, data.duration_minutes, data.is_published, exam_id),
        )
        write_audit(conn, user["id"], "ubah_ujian", f"Ujian {exam_id} diperbarui", client_ip(request))
    return {"ok": True}


@app.get("/api/dosen/ujian/{exam_id}/soal")
def dosen_bank_soal(exam_id: int, user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT q.id, q.number, q.body,
                   json_agg(json_build_object('id', o.id, 'label', o.label,
                            'body', o.body, 'is_correct', o.is_correct)
                            ORDER BY o.label) AS options
            FROM questions q
            JOIN options o ON o.question_id = q.id
            WHERE q.exam_id = %s
            GROUP BY q.id
            ORDER BY q.number
            """,
            (exam_id,),
        )
        return cur.fetchall()


@app.post("/api/dosen/ujian/{exam_id}/soal")
def dosen_tambah_soal(exam_id: int, data: SoalIn, request: Request, user: dict = Depends(require_role("dosen"))):
    validasi_pilihan(data.options)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM exams WHERE id = %s", (exam_id,))
        if not cur.fetchone():
            raise HTTPException(404, "Ujian tidak ditemukan")
        cur.execute(
            "INSERT INTO questions (exam_id, number, body) VALUES (%s, %s, %s) RETURNING id",
            (exam_id, data.number, data.body),
        )
        qid = cur.fetchone()["id"]
        for o in data.options:
            cur.execute(
                "INSERT INTO options (question_id, label, body, is_correct) VALUES (%s, %s, %s, %s)",
                (qid, o.label, o.body, o.is_correct),
            )
        write_audit(conn, user["id"], "tambah_soal", f"Soal {qid} ditambahkan ke ujian {exam_id}", client_ip(request))
    return {"id": qid}


@app.put("/api/dosen/soal/{question_id}")
def dosen_ubah_soal(question_id: int, data: SoalIn, request: Request, user: dict = Depends(require_role("dosen"))):
    validasi_pilihan(data.options)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT exam_id FROM questions WHERE id = %s", (question_id,))
        if not cur.fetchone():
            raise HTTPException(404, "Soal tidak ditemukan")
        cur.execute(
            "UPDATE questions SET number = %s, body = %s WHERE id = %s",
            (data.number, data.body, question_id),
        )
        cur.execute("DELETE FROM options WHERE question_id = %s", (question_id,))
        for o in data.options:
            cur.execute(
                "INSERT INTO options (question_id, label, body, is_correct) VALUES (%s, %s, %s, %s)",
                (question_id, o.label, o.body, o.is_correct),
            )
        write_audit(conn, user["id"], "ubah_soal", f"Soal {question_id} diperbarui", client_ip(request))
    return {"ok": True}


@app.delete("/api/dosen/soal/{question_id}")
def dosen_hapus_soal(question_id: int, request: Request, user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM questions WHERE id = %s", (question_id,))
        if not cur.fetchone():
            raise HTTPException(404, "Soal tidak ditemukan")
        cur.execute("DELETE FROM questions WHERE id = %s", (question_id,))
        write_audit(conn, user["id"], "hapus_soal", f"Soal {question_id} dihapus", client_ip(request))
    return {"ok": True}


@app.get("/api/dosen/ujian/{exam_id}/status")
def dosen_status(exam_id: int, user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT u.id AS student_id, u.full_name, u.nim_nip,
                   es.id AS session_id, es.status, es.score, es.started_at, es.submitted_at,
                   (SELECT COUNT(*) FROM warning_logs w WHERE w.session_id = es.id) AS jumlah_peringatan
            FROM users u
            LEFT JOIN exam_sessions es ON es.student_id = u.id AND es.exam_id = %s
            WHERE u.role = 'mahasiswa'
            ORDER BY u.full_name
            """,
            (exam_id,),
        )
        return cur.fetchall()


@app.put("/api/dosen/sesi/{session_id}/nilai")
def dosen_ubah_nilai(session_id: int, data: NilaiIn, request: Request, user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT es.score, u.full_name
            FROM exam_sessions es JOIN users u ON u.id = es.student_id
            WHERE es.id = %s
            """,
            (session_id,),
        )
        ses = cur.fetchone()
        if not ses:
            raise HTTPException(404, "Sesi tidak ditemukan")
        lama = ses["score"]
        cur.execute("UPDATE exam_sessions SET score = %s WHERE id = %s", (data.score, session_id))
        write_audit(
            conn, user["id"], "ubah_nilai",
            f"Nilai {ses['full_name']} (sesi {session_id}) {lama} -> {data.score}. Alasan: {data.alasan}",
            client_ip(request),
        )
    return {"ok": True, "score": data.score}


@app.get("/api/dosen/peringatan")
def dosen_peringatan(user: dict = Depends(require_role("dosen")), ujian: int | None = None, level: str | None = None):
    sql = """
        SELECT w.id, w.level, w.event, w.detail, w.created_at,
               u.full_name AS student_name, e.title AS exam_title, es.id AS session_id
        FROM warning_logs w
        JOIN exam_sessions es ON es.id = w.session_id
        JOIN users u ON u.id = es.student_id
        JOIN exams e ON e.id = es.exam_id
        WHERE 1 = 1
    """
    params: list = []
    if ujian is not None:
        sql += " AND e.id = %s"
        params.append(ujian)
    if level in ("rendah", "sedang", "tinggi"):
        sql += " AND w.level = %s"
        params.append(level)
    sql += " ORDER BY w.created_at DESC"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.get("/api/dosen/audit")
def dosen_audit(user: dict = Depends(require_role("dosen"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.action, a.detail, a.ip, a.created_at, u.full_name AS actor
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT 200
            """
        )
        return cur.fetchall()


PAGES = {
    "/": "index.html",
    "/mahasiswa": "mahasiswa.html",
    "/ujian": "ujian.html",
    "/dosen": "dosen.html",
    "/peringatan": "peringatan.html",
    "/editor": "editor.html",
    "/sesi-habis": "sesi-habis.html",
    "/error": "error.html",
}


def _page(name: str):
    def handler():
        return FileResponse(STATIC_DIR / name)
    return handler


for path, filename in PAGES.items():
    app.get(path, include_in_schema=False)(_page(filename))

app.mount("/", StaticFiles(directory=STATIC_DIR), name="static")
