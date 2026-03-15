-- Migration 003: Membership system
-- Creates membership_status enum, adds membership columns to users table, and creates app_settings table

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE membership_status AS ENUM ('activo', 'inactivo', 'pausado');
  END IF;
END$$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_status membership_status NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS membership_notes TEXT;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('whatsapp_admin_number', ''),
  ('payment_link_url', '')
ON CONFLICT (key) DO NOTHING;
