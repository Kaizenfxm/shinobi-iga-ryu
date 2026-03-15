DO $$ BEGIN
  CREATE TYPE class_status AS ENUM ('programada', 'en_curso', 'finalizada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sede VARCHAR(50) NOT NULL,
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  profesor_id INTEGER REFERENCES users(id),
  max_capacity INTEGER,
  status class_status NOT NULL DEFAULT 'programada',
  qr_token VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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
  checked_in_at TIMESTAMP DEFAULT NOW() NOT NULL,
  rating INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS class_attendances_class_user_idx ON class_attendances(class_id, user_id);
