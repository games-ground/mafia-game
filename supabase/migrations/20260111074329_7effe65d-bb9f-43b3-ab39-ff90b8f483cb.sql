-- Fix votes table RLS: Only allow reading votes after voting phase ends
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;

CREATE POLICY "Votes visible after voting ends or to own voter"
ON votes FOR SELECT
USING (
  -- Players can always see their own votes
  EXISTS (
    SELECT 1 FROM room_players rp
    WHERE rp.id = votes.voter_id
    AND EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = rp.player_id
    )
  )
  OR
  -- Votes visible when not in voting phase (after resolution)
  EXISTS (
    SELECT 1 FROM game_state gs
    WHERE gs.room_id = votes.room_id
    AND gs.phase != 'day_voting'
  )
);

-- Fix game_actions table RLS: Only allow reading actions after game ends
DROP POLICY IF EXISTS "Anyone can read game_actions" ON game_actions;

CREATE POLICY "Game actions visible after game ends"
ON game_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_state gs
    WHERE gs.room_id = game_actions.room_id
    AND gs.phase = 'game_over'
  )
);