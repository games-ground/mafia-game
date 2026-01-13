-- Create a secure function to update player nickname by browser_id
-- This function runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.update_player_nickname(p_browser_id text, p_nickname text)
RETURNS players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_player players;
BEGIN
  -- Update the player record and return it
  UPDATE players 
  SET nickname = p_nickname, updated_at = now()
  WHERE browser_id = p_browser_id
  RETURNING * INTO updated_player;
  
  RETURN updated_player;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.update_player_nickname(text, text) TO anon, authenticated;