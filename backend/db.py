"""Local profiles with transactional migration from the original single companion."""
import json
import sqlite3
import threading
from datetime import datetime
from config import DB_PATH

_lock = threading.RLock()
PERSONAL_SETTINGS = {'affection', 'last_summary_at'}

def _conn():
    c = sqlite3.connect(DB_PATH, timeout=15, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def _now():
    return datetime.now().isoformat(timespec='seconds')

def init_db():
    with _lock, _conn() as c:
        c.execute('CREATE TABLE IF NOT EXISTS companion(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, content TEXT NOT NULL, ts TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS memories(id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, ts TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)')
        c.execute('CREATE TABLE IF NOT EXISTS profiles(id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, created_at TEXT NOT NULL)')
        if 'online' not in {r['name'] for r in c.execute('PRAGMA table_info(messages)')}:
            c.execute('ALTER TABLE messages ADD COLUMN online TEXT')
        for table in ('messages', 'memories'):
            columns = {r['name'] for r in c.execute(f'PRAGMA table_info({table})')}
            if 'profile_id' not in columns:
                c.execute(f'ALTER TABLE {table} ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1')
            c.execute(f'CREATE INDEX IF NOT EXISTS {table}_profile ON {table}(profile_id, id)')
        if not c.execute("SELECT 1 FROM settings WHERE key='profiles_migrated'").fetchone():
            old = c.execute('SELECT data FROM companion WHERE id=1').fetchone()
            if old:
                c.execute('INSERT OR IGNORE INTO profiles(id,data,created_at) VALUES(1,?,?)', (old['data'], _now()))
                c.execute("INSERT OR REPLACE INTO settings VALUES('active_profile','1')")
                for key in PERSONAL_SETTINGS:
                    row = c.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()
                    if row: c.execute('INSERT OR REPLACE INTO settings VALUES(?,?)', (f'p1:{key}', row['value']))
            c.execute("INSERT INTO settings VALUES('profiles_migrated','1')")

def active_profile():
    with _conn() as c:
        row = c.execute("SELECT value FROM settings WHERE key='active_profile'").fetchone()
    return int(row['value']) if row else 1

def list_profiles():
    with _conn() as c:
        rows = c.execute('SELECT * FROM profiles ORDER BY id').fetchall()
    return [{**json.loads(r['data']), 'id': r['id'], 'created_at': r['created_at']} for r in rows]

def create_profile(data):
    with _lock, _conn() as c:
        cur = c.execute('INSERT INTO profiles(data,created_at) VALUES(?,?)', (json.dumps(data, ensure_ascii=False), _now()))
        pid = cur.lastrowid
        c.execute("INSERT OR REPLACE INTO settings VALUES('active_profile',?)", (str(pid),))
    return pid

def switch_profile(pid):
    with _lock, _conn() as c:
        if not c.execute('SELECT 1 FROM profiles WHERE id=?', (pid,)).fetchone(): return False
        c.execute("INSERT OR REPLACE INTO settings VALUES('active_profile',?)", (str(pid),))
    return True

def get_companion(profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _conn() as c:
        row = c.execute('SELECT data FROM profiles WHERE id=?', (pid,)).fetchone()
    return json.loads(row['data']) if row else None

def save_companion(d, profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _lock:
        with _conn() as c:
            exists = c.execute('SELECT 1 FROM profiles WHERE id=?', (pid,)).fetchone()
            if exists: c.execute('UPDATE profiles SET data=? WHERE id=?', (json.dumps(d, ensure_ascii=False), pid))
        if not exists:
            if profile_id is not None: raise ValueError('角色已不存在')
            create_profile(d)
    return d

def add_message(role, content, profile_id=None, online=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _lock, _conn() as c:
        cur = c.execute('INSERT INTO messages(role,content,ts,profile_id,online) VALUES(?,?,?,?,?)', (role, content, _now(), pid, json.dumps(online,ensure_ascii=False) if online else None))
        return cur.lastrowid

def list_messages(limit=200, desc=False, profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _conn() as c:
        rows = c.execute('SELECT * FROM messages WHERE profile_id=? ORDER BY id DESC LIMIT ?', (pid, limit)).fetchall()
    result = [dict(r) for r in rows]
    for row in result:
        row['online'] = json.loads(row['online']) if row.get('online') else None
    return result if desc else result[::-1]

def count_messages(role=None, profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _conn() as c:
        return c.execute('SELECT COUNT(*) FROM messages WHERE profile_id=?' + (' AND role=?' if role else ''), (pid, role) if role else (pid,)).fetchone()[0]

def clear_messages():
    with _lock, _conn() as c: c.execute('DELETE FROM messages WHERE profile_id=?', (active_profile(),))

def add_memory(content, profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _lock, _conn() as c:
        if not c.execute('SELECT 1 FROM profiles WHERE id=?', (pid,)).fetchone(): return
        if not c.execute('SELECT 1 FROM memories WHERE profile_id=? AND content=?', (pid, content)).fetchone():
            c.execute('INSERT INTO memories(content,ts,profile_id) VALUES(?,?,?)', (content[:500], _now(), pid))

def list_memories(limit=100, profile_id=None):
    pid = profile_id if profile_id is not None else active_profile()
    with _conn() as c:
        rows = c.execute('SELECT * FROM memories WHERE profile_id=? ORDER BY id DESC LIMIT ?', (pid, limit)).fetchall()
    return [dict(r) for r in rows][::-1]

def count_memories():
    with _conn() as c: return c.execute('SELECT COUNT(*) FROM memories WHERE profile_id=?', (active_profile(),)).fetchone()[0]

def clear_memories():
    with _lock, _conn() as c: c.execute('DELETE FROM memories WHERE profile_id=?', (active_profile(),))

def delete_memory(memory_id):
    with _lock, _conn() as c: c.execute('DELETE FROM memories WHERE id=? AND profile_id=?', (memory_id, active_profile()))

def edit_memory(memory_id, content):
    with _lock, _conn() as c:
        return c.execute('UPDATE memories SET content=? WHERE id=? AND profile_id=?', (content, memory_id, active_profile())).rowcount > 0

def get_setting(key, default=None, profile_id=None):
    if key in PERSONAL_SETTINGS: key = f'p{profile_id if profile_id is not None else active_profile()}:{key}'
    with _conn() as c: row = c.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()
    return row['value'] if row else default

def set_setting(key, value, profile_id=None):
    if key in PERSONAL_SETTINGS: key = f'p{profile_id if profile_id is not None else active_profile()}:{key}'
    with _lock, _conn() as c: c.execute('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', (key, value))

def reset_all(keep_companion=True):
    clear_messages()
    clear_memories()
    if not keep_companion:
        with _lock, _conn() as c:
            c.execute('DELETE FROM profiles WHERE id=?', (active_profile(),))
            c.execute('DELETE FROM companion')
            row = c.execute('SELECT id FROM profiles ORDER BY id LIMIT 1').fetchone()
            if row: c.execute("INSERT OR REPLACE INTO settings VALUES('active_profile',?)", (str(row['id']),))
