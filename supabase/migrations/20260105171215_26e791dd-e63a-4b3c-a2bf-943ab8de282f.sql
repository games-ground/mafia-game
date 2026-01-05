-- Deduplicate room_players (keep most recent join per player per room)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY room_id, player_id
           ORDER BY joined_at DESC, id DESC
         ) AS rn
  FROM public.room_players
)
DELETE FROM public.room_players rp
USING ranked r
WHERE rp.id = r.id
  AND r.rn > 1;

-- Enforce single room_players row per (room_id, player_id)
CREATE UNIQUE INDEX IF NOT EXISTS room_players_unique_per_room
  ON public.room_players (room_id, player_id);

-- Deduplicate votes (keep most recent vote per voter per day per room)
WITH ranked_votes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY room_id, voter_id, day_number
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.votes
)
DELETE FROM public.votes v
USING ranked_votes rv
WHERE v.id = rv.id
  AND rv.rn > 1;

-- Enforce single vote per (room_id, voter_id, day_number)
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_per_day
  ON public.votes (room_id, voter_id, day_number);
