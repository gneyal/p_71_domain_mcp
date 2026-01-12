import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "domains.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            available BOOLEAN
        )
    """)

    # Add reason column if it doesn't exist (migration for existing DBs)
    try:
        cursor.execute("ALTER TABLE suggestions ADD COLUMN reason TEXT")
    except:
        pass  # Column already exists

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            liked BOOLEAN,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            active BOOLEAN DEFAULT 1
        )
    """)

    # Set default settings if not exist
    defaults = {
        "daily_count": "25",
        "description": "Short, memorable, brandable domain names for a tech startup",
        "tlds": ".com,.io,.ai,.co",
        "schedule_hour": "9",
    }
    for key, value in defaults.items():
        cursor.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )

    conn.commit()
    conn.close()


# Settings operations
def get_setting(key: str) -> Optional[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else None


def get_all_settings() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {row["key"]: row["value"] for row in rows}


def update_setting(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value)
    )
    conn.commit()
    conn.close()


# Suggestions operations
def add_suggestion(domain: str, available: bool, reason: str = "") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO suggestions (domain, available, reason) VALUES (?, ?, ?)",
        (domain, available, reason)
    )
    suggestion_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return suggestion_id


def get_pending_suggestions() -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM suggestions WHERE status = 'pending' ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_suggestion_status(suggestion_id: int, status: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE suggestions SET status = ? WHERE id = ?",
        (status, suggestion_id)
    )
    conn.commit()
    conn.close()


def expire_old_suggestions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE suggestions SET status = 'expired' WHERE status = 'pending'"
    )
    conn.commit()
    conn.close()


# Preferences operations
def add_preference(domain: str, liked: bool, reason: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO preferences (domain, liked, reason) VALUES (?, ?, ?)",
        (domain, liked, reason)
    )
    conn.commit()
    conn.close()


def get_preferences(limit: int = 50) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM preferences ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_liked_domains(limit: int = 20) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT domain FROM preferences WHERE liked = 1 ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [row["domain"] for row in rows]


def get_disliked_domains(limit: int = 20) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT domain FROM preferences WHERE liked = 0 ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [row["domain"] for row in rows]


# Subscribers operations
def add_subscriber(email: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO subscribers (email) VALUES (?)",
            (email.lower().strip(),)
        )
        conn.commit()
        conn.close()
        return True
    except:
        conn.close()
        return False


def get_all_subscribers() -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM subscribers WHERE active = 1")
    rows = cursor.fetchall()
    conn.close()
    return [row["email"] for row in rows]
