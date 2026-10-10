CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  chat_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  profile_name TEXT,
  gender TEXT,
  dob TEXT,
  position TEXT,
  profile_complete INTEGER NOT NULL DEFAULT 0,
  onboarding_step TEXT NOT NULL DEFAULT 'name',
  model TEXT NOT NULL DEFAULT 'fast',
  web_enabled INTEGER NOT NULL DEFAULT 0,
  voice_reply INTEGER NOT NULL DEFAULT 0,
  voice_name TEXT NOT NULL DEFAULT 'luna',
  plan TEXT NOT NULL DEFAULT 'free',
  paid_until TEXT,
  plan_source TEXT,
  subscription_charge_id TEXT,
  subscription_auto_renew INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  invite_code TEXT UNIQUE,
  invited_by_user_id INTEGER,
  birthday_notice_year INTEGER,
  llama_birthday_notice_year INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,memory_key TEXT NOT NULL,memory_value TEXT NOT NULL,confidence REAL NOT NULL DEFAULT 0.8,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,memory_key));
CREATE TABLE IF NOT EXISTS response_actions (response_id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,sources_json TEXT NOT NULL DEFAULT '[]',suggestions_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS monthly_usage (user_id INTEGER NOT NULL,month_key TEXT NOT NULL,ai_count INTEGER NOT NULL DEFAULT 0,web_count INTEGER NOT NULL DEFAULT 0,voice_in_count INTEGER NOT NULL DEFAULT 0,voice_out_count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,month_key));
CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,paid_days INTEGER NOT NULL DEFAULT 0,bonus_coins INTEGER NOT NULL DEFAULT 0,max_uses INTEGER NOT NULL DEFAULT 1,use_count INTEGER NOT NULL DEFAULT 0,expires_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS coupon_redemptions (coupon_id INTEGER NOT NULL,user_id INTEGER NOT NULL,redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(coupon_id,user_id));
CREATE TABLE IF NOT EXISTS coin_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,delta INTEGER NOT NULL,reason TEXT NOT NULL,source_key TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_charge_id TEXT NOT NULL UNIQUE,user_id INTEGER NOT NULL,currency TEXT NOT NULL,amount INTEGER NOT NULL,invoice_payload TEXT,subscription_expiration_date TEXT,is_recurring INTEGER NOT NULL DEFAULT 0,is_first_recurring INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'paid',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admin_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,target_user_id INTEGER,details TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_response_actions_user ON response_actions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_month ON monthly_usage(month_key,user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_active ON coupons(active,expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_ledger(user_id,created_at DESC);
