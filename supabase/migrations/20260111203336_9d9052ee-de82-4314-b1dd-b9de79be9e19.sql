-- Add optional voting duration column to rooms table
-- When null, voting phase has no timer. When set, voting phase uses this duration in seconds.
ALTER TABLE public.rooms ADD COLUMN voting_duration integer DEFAULT NULL;

-- Update the update_room_config function to include voting_duration
CREATE OR REPLACE FUNCTION public.update_room_config(
  p_host_player_id uuid,
  p_room_id uuid,
  p_mafia_count integer DEFAULT NULL,
  p_doctor_count integer DEFAULT NULL,
  p_detective_count integer DEFAULT NULL,
  p_night_duration integer DEFAULT NULL,
  p_day_duration integer DEFAULT NULL,
  p_night_mode text DEFAULT NULL,
  p_reveal_roles_on_death boolean DEFAULT NULL,
  p_show_vote_counts boolean DEFAULT NULL,
  p_voting_duration integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room rooms;
BEGIN
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
  
  -- Update the room with provided values
  UPDATE rooms SET
    mafia_count = COALESCE(p_mafia_count, mafia_count),
    doctor_count = COALESCE(p_doctor_count, doctor_count),
    detective_count = COALESCE(p_detective_count, detective_count),
    night_duration = COALESCE(p_night_duration, night_duration),
    day_duration = COALESCE(p_day_duration, day_duration),
    night_mode = COALESCE(p_night_mode, night_mode),
    reveal_roles_on_death = COALESCE(p_reveal_roles_on_death, reveal_roles_on_death),
    show_vote_counts = COALESCE(p_show_vote_counts, show_vote_counts),
    voting_duration = CASE 
      WHEN p_voting_duration IS NOT NULL THEN p_voting_duration 
      ELSE voting_duration 
    END,
    updated_at = now()
  WHERE id = p_room_id;
  
  RETURN true;
END;
$$;