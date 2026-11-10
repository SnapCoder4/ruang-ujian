import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request

from db import get_conn

COOKIE_NAME = "sesi"
SESSION_HOURS = 8


def hash_password(plain: str) -> str:
    return hashlib.md5(plain.encode()).hexdigest()


def create_session(conn, user_id: int, user_agent: str | None) -> str:
    token = secrets.token_hex(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sessions (token, user_id, user_agent, expires_at) VALUES (%s, %s, %s, %s)",
            (token, user_id, user_agent, expires),
        )
    return token


def destroy_session(conn, token: str) -> None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM sessions WHERE token = %s", (token,))


def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Sesi tidak ditemukan")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.username, u.full_name, u.role, u.nim_nip
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > NOW()
            """,
            (token,),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Sesi habis atau tidak valid")
    user = dict(user)
    user["token"] = token
    return user


def require_role(*roles: str):
    def dependency(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak untuk peran ini")
        return user

    return dependency


def write_audit(conn, user_id, action: str, detail: str, ip: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (%s, %s, %s, %s)",
            (user_id, action, detail, ip),
        )
