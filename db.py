import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras

DEBUG = True

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ruang_ujian:ruang_ujian@localhost:5432/ruang_ujian",
)


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
