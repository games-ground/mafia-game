-- ===========================================
-- SECURITY FIX: Protect player roles from exposure
-- ===========================================

-- 1. Create a view that hides roles from other players
-- This view will be used for public queries instead of direct table access
CREATE OR REPLACE VIEW public.room_players_safe AS
SELECT 
  rp.id,
  rp.room_id,
  rp.player_id,
  rp.is_alive,
  rp.is_ready,
  rp.joined_at,
  CASE 
    -- Show role if game is over
    WHEN EXISTS (
      SELECT 1 FROM game_state gs 
      WHERE gs.room_id = rp.room_id 
      AND gs.phase = 'game_over'
    ) THEN rp.role
    -- Show role if player is dead AND reveal_roles_on_death is true
    WHEN NOT rp.is_alive AND EXISTS (
      SELECT 1 FROM rooms r 
      WHERE r.id = rp.room_id 
      AND r.reveal_roles_on_death = true
    ) THEN rp.role
    -- Otherwise hide role
    ELSE NULL
  END as role
FROM room_players rp;

-- 2. Create secure RPC to get own role (players can always see their own role)
CREATE OR REPLACE FUNCTION public.get_own_role(p_player_id uuid, p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_role text;
BEGIN
  SELECT role::text INTO player_role
  FROM room_players
  WHERE player_id = p_player_id
  AND room_id = p_room_id;
  
  RETURN player_role;
END;
$$;

-- 3. Create secure RPC to get mafia partners (only mafia can see other mafia)
CREATE OR REPLACE FUNCTION public.get_mafia_partners(p_player_id uuid, p_room_id uuid)
RETURNS TABLE(room_player_id uuid, partner_player_id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if requesting player is mafia
  IF NOT EXISTS (
    SELECT 1 FROM room_players
    WHERE player_id = p_player_id
    AND room_id = p_room_id
    AND role = 'mafia'
  ) THEN
    RETURN;
  END IF;
  
  -- Return other mafia members
  RETURN QUERY
  SELECT rp.id, rp.player_id, p.nickname
  FROM room_players rp
  JOIN players p ON p.id = rp.player_id
  WHERE rp.room_id = p_room_id
  AND rp.role = 'mafia'
  AND rp.player_id != p_player_id;
END;
$$;

-- 4. Create secure RPC for host to kick player (server-side validation)
CREATE OR REPLACE FUNCTION public.kick_player(
  p_host_player_id uuid,
  p_room_id uuid,
  p_target_room_player_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_host_id uuid;
BEGIN
  -- Get room host
  SELECT host_id INTO room_host_id FROM rooms WHERE id = p_room_id;
  
  -- Verify kicker is host
  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can kick players';
  END IF;
  
  -- Cannot kick self (the host)
  IF EXISTS (
    SELECT 1 FROM room_players 
    WHERE id = p_target_room_player_id 
    AND player_id = p_host_player_id
  ) THEN
    RAISE EXCEPTION 'Host cannot kick themselves';
  END IF;
  
  -- Perform kick
  DELETE FROM room_players WHERE id = p_target_room_player_id AND room_id = p_room_id;
  
  RETURN true;
END;
$$;

-- 5. Create secure RPC for host to start game
CREATE OR REPLACE FUNCTION public.start_game(
  p_host_player_id uuid,
  p_room_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_host_id uuid;
  room_status text;
BEGIN
  -- Get room info
  SELECT host_id, status INTO room_host_id, room_status FROM rooms WHERE id = p_room_id;
  
  -- Verify starter is host
  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can start the game';
  END IF;
  
  -- Verify room is in waiting status
  IF room_status != 'waiting' THEN
    RAISE EXCEPTION 'Game already started or room not in waiting status';
  END IF;
  
  -- Update room status
  UPDATE rooms SET status = 'playing' WHERE id = p_room_id;
  
  RETURN true;
END;
$$;

-- 6. Create secure RPC for host to update room config
CREATE OR REPLACE FUNCTION public.update_room_config(
  p_host_player_id uuid,
  p_room_id uuid,
  p_mafia_count integer DEFAULT NULL,
  p_doctor_count integer DEFAULT NULL,
  p_detective_count integer DEFAULT NULL,
  p_night_mode text DEFAULT NULL,
  p_day_duration integer DEFAULT NULL,
  p_night_duration integer DEFAULT NULL,
  p_show_vote_counts boolean DEFAULT NULL,
  p_reveal_roles_on_death boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_host_id uuid;
  room_status text;
BEGIN
  -- Get room info
  SELECT host_id, status INTO room_host_id, room_status FROM rooms WHERE id = p_room_id;
  
  -- Verify updater is host
  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can update room config';
  END IF;
  
  -- Verify room is in waiting status
  IF room_status != 'waiting' THEN
    RAISE EXCEPTION 'Cannot update config after game has started';
  END IF;
  
  -- Update only provided fields
  UPDATE rooms SET
    mafia_count = COALESCE(p_mafia_count, mafia_count),
    doctor_count = COALESCE(p_doctor_count, doctor_count),
    detective_count = COALESCE(p_detective_count, detective_count),
    night_mode = COALESCE(p_night_mode, night_mode),
    day_duration = COALESCE(p_day_duration, day_duration),
    night_duration = COALESCE(p_night_duration, night_duration),
    show_vote_counts = COALESCE(p_show_vote_counts, show_vote_counts),
    reveal_roles_on_death = COALESCE(p_reveal_roles_on_death, reveal_roles_on_death)
  WHERE id = p_room_id;
  
  RETURN true;
END;
$$;

-- 7. Add validation to room_players INSERT policy (prevent role assignment on join)
DROP POLICY IF EXISTS "Anyone can join rooms" ON room_players;
CREATE POLICY "Join valid rooms" ON room_players
FOR INSERT WITH CHECK (
  -- Room must exist and be in waiting status
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND status = 'waiting') AND
  -- Cannot set role on join (roles are assigned by game start only)
  role IS NULL AND
  -- Must start as not ready
  is_ready = false AND
  -- Must start as alive
  is_alive = true
);

-- 8. Add validation to players INSERT policy (ensure stats start at zero)
DROP POLICY IF EXISTS "Anyone can create players" ON players;
CREATE POLICY "Create player with valid defaults" ON players
FOR INSERT WITH CHECK (
  -- Stats must start at zero (no fake stats)
  games_played = 0 AND 
  games_won = 0 AND
  games_won_as_civilian = 0 AND
  games_won_as_mafia = 0 AND
  total_kills = 0 AND
  total_saves = 0 AND
  correct_investigations = 0 AND
  visittotal_investigations = 0
);

-- 9. Restrict game_state creation to valid initial states
DROP POLICY IF EXISTS "Anyone can create game_state" ON game_state;
CREATE POLICY "Create valid game state" ON game_state
FOR INSERT WITH CHECK (
  -- Only one game_state per room
  NOT EXISTS (SELECT 1 FROM game_state gs WHERE gs.room_id = game_state.room_id) AND
  -- Must start in night phase (after lobby)
  phase = 'night' AND
  -- Day number must be 1 at start
  day_number = 1
);

-- 10. Restrict messages to prevent fake system messages
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
CREATE POLICY "Create valid messages" ON messages
FOR INSERT WITH CHECK (
  -- Player messages must have player_id and not be system
  (is_system = false AND player_id IS NOT NULL) OR
  -- System messages must not have player_id
  (is_system = true AND player_id IS NULL)
);

-- 11. Create unique constraint for votes to prevent duplicate voting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'votes_unique_per_day'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_unique_per_day 
      UNIQUE (room_id, voter_id, day_number);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 12. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.get_own_role(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mafia_partners(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kick_player(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_game(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_room_config(uuid, uuid, integer, integer, integer, text, integer, integer, boolean, boolean) TO anon, authenticated;

-- 13. Grant SELECT on the safe view
GRANT SELECT ON public.room_players_safe TO anon, authenticated;