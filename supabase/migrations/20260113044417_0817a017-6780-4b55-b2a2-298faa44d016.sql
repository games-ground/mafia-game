-- Fix the players table SELECT policy to allow players to read their own record
-- when they know their browser_id (which is private to the client)

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Block direct player reads" ON public.players;

-- Create a secure function to get player by browser_id
-- This function runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_player_by_browser_id(p_browser_id text)
RETURNS SETOF players
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM players WHERE browser_id = p_browser_id LIMIT 1;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_player_by_browser_id(text) TO anon, authenticated;

-- Keep the players table blocked for direct SELECT
-- Force use of either the RPC function (for own record) or players_public view (for public data)
CREATE POLICY "Block direct player reads - use RPC or view"
ON public.players
FOR SELECT
USING (false);