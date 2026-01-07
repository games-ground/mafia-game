-- Add kicked column to room_players to permanently block kicked players from rejoining
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS kicked boolean NOT NULL DEFAULT false;

-- Create a table to track kicked players per room (by player_id, not room_player_id)
CREATE TABLE IF NOT EXISTS public.kicked_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  kicked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Enable RLS on kicked_players
ALTER TABLE public.kicked_players ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read kicked_players (to check if they're kicked)
CREATE POLICY "Anyone can read kicked_players" ON public.kicked_players FOR SELECT USING (true);

-- Only allow inserts through RPC (no direct inserts)
CREATE POLICY "No direct inserts" ON public.kicked_players FOR INSERT WITH CHECK (false);

-- Update the kick_player function to properly delete the player AND track them
CREATE OR REPLACE FUNCTION public.kick_player(
  p_host_player_id uuid,
  p_room_id uuid,
  p_target_room_player_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_host_id uuid;
  v_target_player_id uuid;
BEGIN
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