-- Secure restart function (bypasses client RLS limitations)
CREATE OR REPLACE FUNCTION public.restart_game(p_host_player_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  room_host_id uuid;
BEGIN
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
$function$;


-- Cleanup idle rooms/games to avoid DB bloat
CREATE OR REPLACE FUNCTION public.cleanup_idle_rooms(p_idle_minutes integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff timestamptz;
  room_ids uuid[];
BEGIN
  cutoff := now() - make_interval(mins => p_idle_minutes);

  SELECT array_agg(r.id)
  INTO room_ids
  FROM rooms r
  LEFT JOIN game_state gs ON gs.room_id = r.id
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM messages m
    WHERE m.room_id = r.id
  ) msg ON true
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM votes v
    WHERE v.room_id = r.id
  ) vt ON true
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM game_actions ga
    WHERE ga.room_id = r.id
  ) act ON true
  WHERE greatest(
    r.updated_at,
    r.created_at,
    coalesce(gs.updated_at, 'epoch'::timestamptz),
    coalesce(msg.max_created_at, 'epoch'::timestamptz),
    coalesce(vt.max_created_at, 'epoch'::timestamptz),
    coalesce(act.max_created_at, 'epoch'::timestamptz)
  ) < cutoff;

  IF room_ids IS NULL OR array_length(room_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete children first (FK order)
  DELETE FROM game_actions WHERE room_id = ANY(room_ids);
  DELETE FROM votes WHERE room_id = ANY(room_ids);
  DELETE FROM messages WHERE room_id = ANY(room_ids);
  DELETE FROM game_state WHERE room_id = ANY(room_ids);
  DELETE FROM room_players WHERE room_id = ANY(room_ids);
  DELETE FROM rooms WHERE id = ANY(room_ids);

  RETURN array_length(room_ids, 1);
END;
$function$;


-- Schedule cleanup every 10 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
DECLARE
  existing_job_id integer;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'cleanup_idle_rooms'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'cleanup_idle_rooms',
    '*/10 * * * *',
    $$SELECT public.cleanup_idle_rooms(60);$$
  );
END;
$do$;