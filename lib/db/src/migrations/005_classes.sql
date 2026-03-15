CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  professor_user_id INTEGER REFERENCES users(id),
  notes TEXT,
  qr_token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS professor_user_id INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS class_training_systems (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  training_system_id INTEGER NOT NULL REFERENCES training_systems(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS class_training_systems_class_system_idx ON class_training_systems(class_id, training_system_id);

CREATE TABLE IF NOT EXISTS class_attendances (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended_at TIMESTAMP DEFAULT NOW() NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS class_attendances_class_user_idx ON class_attendances(class_id, user_id);
