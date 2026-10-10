CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, chat_id INTEGER NOT NULL, username TEXT, first_name TEXT, last_name TEXT, model TEXT NOT NULL DEFAULT 'smart', web_enabled INTEGER NOT NULL DEFAULT 0, voice_reply INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0, invite_code TEXT UNIQUE, invited_by_user_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, message_count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, memory_key TEXT NOT NULL, memory_value TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0.8, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,memory_key));
CREATE TABLE IF NOT EXISTS response_actions (response_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, sources_json TEXT NOT NULL DEFAULT '[]', suggestions_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admin_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, target_user_id INTEGER, details TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_response_actions_user ON response_actions(user_id,created_at DESC);
