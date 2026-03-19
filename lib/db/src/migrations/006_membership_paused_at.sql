-- Migration 006: Add membership_paused_at column to users
-- Tracks when a membership was paused so remaining days can be calculated on resume

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_paused_at TIMESTAMPTZ;
