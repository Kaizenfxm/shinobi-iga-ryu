CREATE TABLE IF NOT EXISTS anthropometric_evaluations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  initial_weight REAL,
  current_weight REAL,
  target_weight REAL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
