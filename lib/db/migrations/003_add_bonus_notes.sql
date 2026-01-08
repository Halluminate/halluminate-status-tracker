-- Migration: Add notes column to weekly_bonus_input table
-- Purpose: Allow users to add notes about what each bonus entry is for

ALTER TABLE weekly_bonus_input ADD COLUMN IF NOT EXISTS notes TEXT;
