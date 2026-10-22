
import os
import re
import sqlite3
import secrets
from datetime import datetime
from zoneinfo import ZoneInfo
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

# ---------- CONFIG ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "sub2unlock.db"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")
SITE_URL = os.getenv(
    "SITE_URL",
    "https://onefirstamane-ops.github.io/AG-SUB2UNLOCK"
).rstrip("/")

ALLOWED_ORIGINS = {
    SITE_URL,
    "https://onefirstamane-ops.github.io",
    "http://localhost:8080"
}

TZ = ZoneInfo("Asia/Dhaka")
MAX_UPLOAD_MB = 50

os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

TASK_DEFAULTS = [
    (1, "Subscribe to YouTube Channel 1", "permanent",
     "https://www.youtube.com/@MUSE_AG"),
    (2, "Subscribe to YouTube Channel 2", "permanent",
     "https://www.youtube.com/@Kiyotaka1M"),
    (3, "Join Telegram Community", "permanent",
     "https://t.me/AG_AMANE_COMMUNITY"),
    (4, "Follow on TikTok", "permanent",
     "https://www.tiktok.com/@agamaneofficial"),
    (5, "Follow on Facebook", "permanent",
     "https://www.facebook.com/share/1cbvxojjj7/"),
    (6, "Like and Comment on YouTube Video", "daily",
     "https://youtube.com/shorts/MFV4IJbaQ2g?si=eqmgGjk53oG8xj3P"),
    (7, "Like and Comment on TikTok Video", "daily",
     "https://vm.tiktok.com/ZSgy7b4aw/"),
]

# ---------- DATABASE ----------
def db():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                kind TEXT NOT NULL,
                url TEXT NOT NULL,
                changed_date TEXT
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                media_type TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                code TEXT PRIMARY KEY,
                file_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(file_id) REFERENCES files(id)
            )
        """)

        count = conn.execute(
            "SELECT COUNT(*) FROM tasks"
        ).fetchone()[0]

        if count == 0:
            conn.executemany(
                "INSERT INTO tasks(id,title,kind,url) VALUES(?,?,?,?)",
                TASK_DEFAULTS
            )


init_db()


def dhaka_now():
    return datetime.now(TZ)


def row_dict(row):
    return dict(row) if row else None


# ---------- CORS ----------
@app.after_request
def cors(response):
    origin = request.headers.get("Origin", "")

    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, X-Admin-Key"
        )
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/<path:path>", methods=["OPTIONS"])
@app.route("/", methods=["OPTIONS"])
def options(path=None):
    return "", 204


# ---------- AUTH ----------
def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not ADMIN_API_KEY:
            return jsonify({
                "ok": False,
                "error": "ADMIN_API_KEY is not configured on the server"
            }), 503

        supplied = request.headers.get("X-Admin-Key", "")
        if not secrets.compare_digest(supplied, ADMIN_API_KEY):
            return jsonify({
                "ok": False,
                "error": "Unauthorized"
            }), 401

        return func(*args, **kwargs)
    return wrapper


# ---------- PUBLIC API ----------
@app.get("/")
def home():
    return jsonify({
        "name": "AG SUB2UNLOCK API",
        "status": "online",
        "health": "/api/health"
    })


@app.get("/api/health")
def health():
    try:
        with db() as conn:
            conn.execute("SELECT 1").fetchone()

        return jsonify({
            "ok": True,
            "service": "AG SUB2UNLOCK",
            "database": "connected",
            "time_dhaka": dhaka_now().isoformat()
        })
    except sqlite3.Error:
        app.logger.exception("Database health check failed")
        return jsonify({
            "ok": False,
            "error": "Database unavailable"
        }), 500


@app.get("/api/tasks")
def list_tasks():
    with db() as conn:
        rows = conn.execute(
            "SELECT id,title,kind,url FROM tasks ORDER BY id"
        ).fetchall()

    return jsonify({
        "ok": True,
        "tasks": [dict(row) for row in rows]
    })


@app.get("/api/campaign/<code>")
def get_campaign(code):
    if not re.fullmatch(r"[a-f0-9]{12}", code):
        return jsonify({"ok": False, "error": "Invalid campaign code"}), 400

    with db() as conn:
        campaign = conn.execute("""
            SELECT c.code, c.created_at, f.original_name, f.media_type
            FROM campaigns c
            JOIN files f ON f.id = c.file_id
            WHERE c.code = ?
        """, (code,)).fetchone()

        tasks = conn.execute(
            "SELECT id,title,kind,url FROM tasks ORDER BY id"
        ).fetchall()

    if not campaign:
        return jsonify({"ok": False, "error": "Campaign not found"}), 404

    return jsonify({
        "ok": True,
        "campaign": dict(campaign),
        "tasks": [dict(row) for row in tasks]
    })


# ---------- ADMIN API ----------
@app.get("/api/admin/summary")
@admin_required
def admin_summary():
    with db() as conn:
        task_count = conn.execute(
            "SELECT COUNT(*) FROM tasks"
        ).fetchone()[0]
        file_count = conn.execute(
            "SELECT COUNT(*) FROM files"
        ).fetchone()[0]
        campaign_count = conn.execute(
            "SELECT COUNT(*) FROM campaigns"
        ).fetchone()[0]

    return jsonify({
        "ok": True,
        "tasks": task_count,
        "files": file_count,
        "campaigns": campaign_count
    })


@app.post("/api/admin/tasks/<int:task_id>")
@admin_required
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()

    if not url.startswith("https://") or len(url) > 2000:
        return jsonify({
            "ok": False,
            "error": "A valid HTTPS URL is required"
        }), 400

    with db() as conn:
        task = conn.execute(
            "SELECT id,kind,changed_date FROM tasks WHERE id = ?",
            (task_id,)
        ).fetchone()

        if not task:
            return jsonify({"ok": False, "error": "Task not found"}), 404

        today = dhaka_now().strftime("%Y-%m-%d")

        if task["kind"] == "daily" and task["changed_date"] == today:
            return jsonify({
                "ok": False,
                "error": "Daily task link already changed today (Dhaka time)"
            }), 409

        if task["kind"] == "daily":
            conn.execute(
                "UPDATE tasks SET url=?, changed_date=? WHERE id=?",
                (url, today, task_id)
            )
        else:
            conn.execute(
                "UPDATE tasks SET url=? WHERE id=?",
                (url, task_id)
            )

    return jsonify({"ok": True, "message": "Task link updated"})


@app.post("/api/admin/files")
@admin_required
def upload_file():
    uploaded = request.files.get("file")

    if not uploaded or not uploaded.filename:
        return jsonify({
            "ok": False,
            "error": "Choose a file to upload"
        }), 400

    original_name = secure_filename(uploaded.filename)
    if not original_name:
        return jsonify({"ok": False, "error": "Invalid filename"}), 400

    stored_name = secrets.token_hex(16) + "_" + original_name
    path = os.path.join(UPLOAD_DIR, stored_name)

    try:
        uploaded.save(path)

        with db() as conn:
            cursor = conn.execute("""
                INSERT INTO files(original_name,stored_name,media_type,uploaded_at)
                VALUES(?,?,?,?)
            """, (
                original_name,
                stored_name,
                uploaded.mimetype or "application/octet-stream",
                dhaka_now().isoformat()
            ))
            file_id = cursor.lastrowid

        return jsonify({
            "ok": True,
            "file_id": file_id,
            "filename": original_name,
            "message": "File uploaded"
        }), 201

    except Exception:
        if os.path.exists(path):
            os.remove(path)
        app.logger.exception("File upload failed")
        return jsonify({"ok": False, "error": "Upload failed"}), 500


@app.post("/api/admin/campaigns")
@admin_required
def create_campaign():
    data = request.get_json(silent=True) or {}

    try:
        file_id = int(data.get("file_id"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "Valid file_id required"}), 400

    with db() as conn:
        file_row = conn.execute(
            "SELECT id FROM files WHERE id=?",
            (file_id,)
        ).fetchone()

        if not file_row:
            return jsonify({"ok": False, "error": "File not found"}), 404

        code = secrets.token_hex(6)
        conn.execute("""
            INSERT INTO campaigns(code,file_id,created_at)
            VALUES(?,?,?)
        """, (code, file_id, dhaka_now().isoformat()))

    return jsonify({
        "ok": True,
        "code": code,
        "campaign_url": f"{SITE_URL}/?code={code}",
        "message": "Campaign created"
    }), 201


# ---------- ERROR HANDLERS ----------
@app.errorhandler(413)
def too_large(_error):
    return jsonify({
        "ok": False,
        "error": f"File is too large. Maximum size is {MAX_UPLOAD_MB} MB."
    }), 413


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"ok": False, "error": "Endpoint not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
