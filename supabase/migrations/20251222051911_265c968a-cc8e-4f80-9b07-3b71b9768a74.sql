-- Fix the security definer view issue by recreating as regular view
-- Regular views inherit the permissions of the querying user (SECURITY INVOKER is default)
DROP VIEW IF EXISTS public.room_players_safe;

CREATE VIEW public.room_players_safe AS
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

-- Grant SELECT on the safe view
GRANT SELECT ON public.room_players_safe TO anon, authenticated;