-- Fix ALL views to use SECURITY INVOKER to resolve the security definer warnings

-- Recreate game_state_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.game_state_safe;
CREATE VIEW public.game_state_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  room_id,
  phase,
  phase_end_time,
  day_number,
  winner,
  created_at,
  updated_at,
  CASE
    WHEN phase = ANY (ARRAY['day_discussion'::game_phase, 'day_voting'::game_phase, 'game_over'::game_phase]) 
    THEN last_mafia_target_name
    ELSE NULL::text
  END AS last_mafia_target_name,
  CASE
    WHEN phase = ANY (ARRAY['day_discussion'::game_phase, 'day_voting'::game_phase, 'game_over'::game_phase]) 
    THEN last_doctor_target_name
    ELSE NULL::text
  END AS last_doctor_target_name,
  CASE
    WHEN phase = ANY (ARRAY['day_discussion'::game_phase, 'day_voting'::game_phase, 'game_over'::game_phase]) 
    THEN last_detective_target_name
    ELSE NULL::text
  END AS last_detective_target_name
FROM game_state;

-- Recreate room_players_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.room_players_safe;
CREATE VIEW public.room_players_safe
WITH (security_invoker = true)
AS
SELECT 
  rp.id,
  rp.room_id,
  rp.player_id,
  rp.is_ready,
  rp.is_alive,
  rp.joined_at,
  rp.kicked,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = rp.room_id AND r.status = 'waiting'::text
    ) THEN rp.role
    WHEN EXISTS (
      SELECT 1 FROM game_state gs
      WHERE gs.room_id = rp.room_id AND gs.phase = 'game_over'::game_phase
    ) THEN rp.role
    ELSE NULL::role_type
  END AS role
FROM room_players rp;

-- Recreate players_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  nickname,
  games_played,
  games_won,
  games_won_as_mafia,
  games_won_as_civilian,
  total_kills,
  total_saves,
  correct_investigations,
  visittotal_investigations,
  profile_id,
  created_at,
  updated_at
FROM players;

-- Recreate profiles_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  games_played,
  games_won,
  games_won_as_mafia,
  games_won_as_civilian,
  total_kills,
  total_saves,
  correct_investigations,
  total_investigations,
  is_premium,
  created_at,
  updated_at
FROM profiles;