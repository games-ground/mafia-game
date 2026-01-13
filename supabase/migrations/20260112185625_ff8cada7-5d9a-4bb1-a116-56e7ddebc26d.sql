-- ============================================================
-- FIX 1: Add browser_id validation to ALL RPC functions
-- ============================================================

-- Drop and recreate kick_player with browser_id validation
DROP FUNCTION IF EXISTS public.kick_player(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.kick_player(uuid, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.kick_player(
  p_host_player_id uuid,
  p_browser_id text,
  p_room_id uuid,
  p_target_room_player_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actual_browser_id text;
  v_room_host_id uuid;
  v_target_player_id uuid;
BEGIN
  -- SECURITY: Verify browser_id matches the claimed player
  SELECT browser_id INTO v_actual_browser_id FROM players WHERE id = p_host_player_id;
  
  IF v_actual_browser_id IS NULL OR v_actual_browser_id != p_browser_id THEN
    RAISE EXCEPTION 'Authentication failed';
  END IF;

  -- Verify the caller is the host
  SELECT host_id INTO v_room_host_id FROM rooms WHERE id = p_room_id;
  
  IF v_room_host_id IS NULL OR v_room_host_id != p_host_player_id THEN
    RETURN false;
  END IF;
  
  -- Get the player_id of the target
  SELECT player_id INTO v_target_player_id FROM room_players WHERE id = p_target_room_player_id;
  
  IF v_target_player_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Add to kicked_players table to prevent rejoin
  INSERT INTO kicked_players (room_id, player_id)
  VALUES (p_room_id, v_target_player_id)
  ON CONFLICT (room_id, player_id) DO NOTHING;
  
  -- Delete the room_player entry
  DELETE FROM room_players WHERE id = p_target_room_player_id;
  
  RETURN true;
END;
$$;

-- Drop and recreate update_room_config with browser_id validation
DROP FUNCTION IF EXISTS public.update_room_config(uuid, uuid, integer, integer, integer, text, integer, integer, boolean, boolean);
DROP FUNCTION IF EXISTS public.update_room_config(uuid, text, uuid, integer, integer, integer, text, integer, integer, integer, boolean, boolean);

CREATE OR REPLACE FUNCTION public.update_room_config(
  p_host_player_id uuid,
  p_browser_id text,
  p_room_id uuid,
  p_mafia_count integer DEFAULT NULL,
  p_doctor_count integer DEFAULT NULL,
  p_detective_count integer DEFAULT NULL,
  p_night_mode text DEFAULT NULL,
  p_day_duration integer DEFAULT NULL,
  p_night_duration integer DEFAULT NULL,
  p_voting_duration integer DEFAULT NULL,
  p_show_vote_counts boolean DEFAULT NULL,
  p_reveal_roles_on_death boolean DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actual_browser_id text;
  v_room rooms;
BEGIN
  -- SECURITY: Verify browser_id matches the claimed player
  SELECT browser_id INTO v_actual_browser_id FROM players WHERE id = p_host_player_id;
  
  IF v_actual_browser_id IS NULL OR v_actual_browser_id != p_browser_id THEN
    RAISE EXCEPTION 'Authentication failed';
  END IF;

  -- Get the room and verify the host
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  
  IF v_room IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  IF v_room.host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only the host can update room configuration';
  END IF;
  
  IF v_room.status != 'waiting' THEN
    RAISE EXCEPTION 'Cannot update configuration after game has started';
  END IF;
  
  -- Update room configuration
  UPDATE rooms SET
    mafia_count = COALESCE(p_mafia_count, mafia_count),
    doctor_count = COALESCE(p_doctor_count, doctor_count),
    detective_count = COALESCE(p_detective_count, detective_count),
    night_mode = COALESCE(p_night_mode, night_mode),
    day_duration = COALESCE(p_day_duration, day_duration),
    night_duration = COALESCE(p_night_duration, night_duration),
    voting_duration = COALESCE(p_voting_duration, voting_duration),
    show_vote_counts = COALESCE(p_show_vote_counts, show_vote_counts),
    reveal_roles_on_death = COALESCE(p_reveal_roles_on_death, reveal_roles_on_death)
  WHERE id = p_room_id;
  
  RETURN true;
END;
$$;

-- Drop and recreate get_own_role with browser_id validation
DROP FUNCTION IF EXISTS public.get_own_role(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_own_role(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_own_role(
  p_player_id uuid,
  p_browser_id text,
  p_room_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actual_browser_id text;
  player_role text;
BEGIN
  -- SECURITY: Verify browser_id matches the claimed player
  SELECT browser_id INTO v_actual_browser_id FROM players WHERE id = p_player_id;
  
  IF v_actual_browser_id IS NULL OR v_actual_browser_id != p_browser_id THEN
    RAISE EXCEPTION 'Authentication failed';
  END IF;

  SELECT role::text INTO player_role
  FROM room_players
  WHERE player_id = p_player_id
  AND room_id = p_room_id;
  
  RETURN player_role;
END;
$$;

-- Drop and recreate get_mafia_partners with browser_id validation
DROP FUNCTION IF EXISTS public.get_mafia_partners(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_mafia_partners(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_mafia_partners(
  p_player_id uuid,
  p_browser_id text,
  p_room_id uuid
) RETURNS TABLE(room_player_id uuid, partner_player_id uuid, nickname text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actual_browser_id text;
BEGIN
  -- SECURITY: Verify browser_id matches the claimed player
  SELECT browser_id INTO v_actual_browser_id FROM players WHERE id = p_player_id;
  
  IF v_actual_browser_id IS NULL OR v_actual_browser_id != p_browser_id THEN
    RAISE EXCEPTION 'Authentication failed';
  END IF;

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

-- Drop and recreate restart_game with browser_id validation
DROP FUNCTION IF EXISTS public.restart_game(uuid, uuid);
DROP FUNCTION IF EXISTS public.restart_game(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.restart_game(
  p_host_player_id uuid,
  p_browser_id text,
  p_room_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actual_browser_id text;
  room_host_id uuid;
BEGIN
  -- SECURITY: Verify browser_id matches the claimed player
  SELECT browser_id INTO v_actual_browser_id FROM players WHERE id = p_host_player_id;
  
  IF v_actual_browser_id IS NULL OR v_actual_browser_id != p_browser_id THEN
    RAISE EXCEPTION 'Authentication failed';
  END IF;

  SELECT host_id INTO room_host_id FROM rooms WHERE id = p_room_id;

  IF room_host_id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can restart the game';
  END IF;

  -- Put room back to lobby first so all clients immediately sync
  UPDATE rooms SET status = 'waiting' WHERE id = p_room_id;

  -- Clear all game-specific state for this room (order matters for FKs)
  DELETE FROM game_actions WHERE room_id = p_room_id;
  DELETE FROM votes WHERE room_id = p_room_id;
  DELETE FROM messages WHERE room_id = p_room_id;
  DELETE FROM game_state WHERE room_id = p_room_id;

  -- Reset players (keep them in the room)
  UPDATE room_players
    SET is_alive = true,
        role = NULL,
        is_ready = false
  WHERE room_id = p_room_id;

  -- Add fresh system message
  INSERT INTO messages (room_id, content, is_system, is_mafia_only, role_type)
  VALUES (p_room_id, '🔄 Game has been reset. Waiting for players to ready up...', true, false, NULL);

  RETURN true;
END;
$$;

-- ============================================================
-- FIX 2: Create safe view for players (hide browser_id)
-- ============================================================

CREATE OR REPLACE VIEW public.players_public AS
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

-- ============================================================
-- FIX 3: Create safe view for profiles (hide email)
-- ============================================================

CREATE OR REPLACE VIEW public.profiles_public AS
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