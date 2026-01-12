-- Drop and recreate views with correct column order

-- First drop the views
DROP VIEW IF EXISTS public.room_players_safe;
DROP VIEW IF EXISTS public.game_state_safe;

-- Recreate room_players_safe view that hides roles during active games
CREATE VIEW public.room_players_safe WITH (security_invoker = true) AS
SELECT 
  rp.id,
  rp.room_id,
  rp.player_id,
  rp.is_ready,
  rp.is_alive,
  rp.joined_at,
  rp.kicked,
  -- Only show role in safe scenarios: lobby/waiting or game_over
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = rp.room_id
      AND r.status = 'waiting'
    ) THEN rp.role
    WHEN EXISTS (
      SELECT 1 FROM game_state gs 
      WHERE gs.room_id = rp.room_id 
      AND gs.phase = 'game_over'
    ) THEN rp.role
    ELSE NULL
  END as role
FROM room_players rp;

-- Grant access to the safe view
GRANT SELECT ON public.room_players_safe TO authenticated, anon;

-- Restrict direct access to room_players table (block public reads during games)
DROP POLICY IF EXISTS "Anyone can read room_players" ON room_players;
DROP POLICY IF EXISTS "Read room_players during safe phases only" ON room_players;

CREATE POLICY "Read room_players during safe phases only" ON room_players
FOR SELECT USING (
  -- Allow during lobby/waiting
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = room_players.room_id
    AND r.status = 'waiting'
  )
  OR
  -- Allow after game over
  EXISTS (
    SELECT 1 FROM game_state gs
    WHERE gs.room_id = room_players.room_id
    AND gs.phase = 'game_over'
  )
);

-- Create game_state_safe view that hides sensitive night action fields
CREATE VIEW public.game_state_safe WITH (security_invoker = true) AS
SELECT 
  id, 
  room_id, 
  phase, 
  phase_end_time, 
  day_number, 
  winner,
  created_at, 
  updated_at,
  -- Only expose outcome names after resolution (day phase or game over)
  CASE 
    WHEN phase IN ('day_discussion', 'day_voting', 'game_over') 
      THEN last_mafia_target_name 
    ELSE NULL 
  END as last_mafia_target_name,
  CASE 
    WHEN phase IN ('day_discussion', 'day_voting', 'game_over')
      THEN last_doctor_target_name 
    ELSE NULL 
  END as last_doctor_target_name,
  CASE 
    WHEN phase IN ('day_discussion', 'day_voting', 'game_over')
      THEN last_detective_target_name 
    ELSE NULL 
  END as last_detective_target_name
  -- Never expose target IDs or detective_result to clients
FROM game_state;

-- Grant access to the safe view
GRANT SELECT ON public.game_state_safe TO authenticated, anon;

-- Restrict direct game_state reads - force use of safe view
DROP POLICY IF EXISTS "Anyone can read game_state" ON game_state;
DROP POLICY IF EXISTS "Block direct game_state reads from clients" ON game_state;

CREATE POLICY "Block direct game_state reads from clients" ON game_state
FOR SELECT USING (false);