-- Add new configuration columns to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS show_vote_counts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS reveal_roles_on_death boolean NOT NULL DEFAULT true;

-- Add spectator info to game_state for dead players
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS last_mafia_target_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_doctor_target_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_detective_target_name text DEFAULT NULL;