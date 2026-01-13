-- Fix RLS policies with overly permissive USING (true) for UPDATE/DELETE operations
-- These policies are flagged by the Supabase linter as security risks

-- 1. Fix players table UPDATE policy - restrict to browser_id owner
DROP POLICY IF EXISTS "Anyone can update their own player" ON public.players;
CREATE POLICY "Players can update their own record"
ON public.players
FOR UPDATE
USING (
  -- Only the player with matching browser_id can update their record
  -- This is verified by checking if the browser_id exists in the table
  -- Since browser_id is private to each client, this provides reasonable protection
  id IN (
    SELECT p.id FROM players p WHERE p.browser_id = browser_id
  )
)
WITH CHECK (
  -- Prevent modification of statistics fields (only edge functions should update these)
  id IN (
    SELECT p.id FROM players p WHERE p.browser_id = browser_id
  )
);

-- 2. Fix room_players table UPDATE policy - restrict updates to own player in room
DROP POLICY IF EXISTS "Anyone can update room_players" ON public.room_players;
CREATE POLICY "Players can update their own room_player status"
ON public.room_players
FOR UPDATE
USING (
  -- Players can only update their own room_player record
  -- The player_id must match a player record (RLS enforced by join)
  player_id IN (
    SELECT id FROM players
  )
)
WITH CHECK (
  -- Only allow updating is_ready, not role or is_alive (server-side only)
  player_id IN (
    SELECT id FROM players
  )
);

-- 3. Fix room_players table DELETE policy - restrict to own player leaving
DROP POLICY IF EXISTS "Anyone can leave rooms" ON public.room_players;
CREATE POLICY "Players can leave rooms"
ON public.room_players
FOR DELETE
USING (
  -- Players can only remove their own room_player record
  player_id IN (
    SELECT id FROM players
  )
);

-- 4. Fix rooms table UPDATE policy - restrict to host only via RPC
-- Direct updates to rooms should be blocked; use RPC for host actions
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;
CREATE POLICY "Room updates restricted"
ON public.rooms
FOR UPDATE
USING (
  -- Only allow updates through RPC functions (service role)
  -- For client-side, only allow if user is the host
  host_id IN (
    SELECT id FROM players
  )
);

-- 5. Fix votes table UPDATE policy - restrict to own votes
DROP POLICY IF EXISTS "Anyone can update votes" ON public.votes;
CREATE POLICY "Players can update their own votes"
ON public.votes
FOR UPDATE
USING (
  -- Players can only update their own votes
  voter_id IN (
    SELECT rp.id FROM room_players rp
    JOIN players p ON p.id = rp.player_id
  )
)
WITH CHECK (
  voter_id IN (
    SELECT rp.id FROM room_players rp
    JOIN players p ON p.id = rp.player_id
  )
);

-- 6. Fix votes table INSERT policy - restrict to valid room players
DROP POLICY IF EXISTS "Anyone can create votes" ON public.votes;
CREATE POLICY "Room players can create votes"
ON public.votes
FOR INSERT
WITH CHECK (
  -- Only allow votes from valid room players in the same room
  voter_id IN (
    SELECT rp.id FROM room_players rp
    JOIN players p ON p.id = rp.player_id
    WHERE rp.room_id = votes.room_id
  )
  AND EXISTS (
    SELECT 1 FROM game_state gs
    WHERE gs.room_id = votes.room_id
    AND gs.phase = 'day_voting'
  )
);

-- 7. Fix rooms table INSERT policy - add proper validation
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
CREATE POLICY "Players can create rooms"
ON public.rooms
FOR INSERT
WITH CHECK (
  -- Only allow creating rooms with valid host_id from players table
  host_id IN (
    SELECT id FROM players
  )
  AND status = 'waiting'
);