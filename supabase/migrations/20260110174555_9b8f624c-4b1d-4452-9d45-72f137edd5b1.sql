-- Fix 1: Block client updates to game_state (only edge functions with service role can update)
DROP POLICY IF EXISTS "Anyone can update game_state" ON game_state;
CREATE POLICY "No client updates to game_state" ON game_state 
  FOR UPDATE 
  USING (false);

-- Fix 2: Block client inserts to game_actions (only edge functions with service role can insert)
DROP POLICY IF EXISTS "Anyone can create game_actions" ON game_actions;
CREATE POLICY "No client inserts to game_actions" ON game_actions 
  FOR INSERT 
  WITH CHECK (false);

-- Fix 3: Create a function and trigger for server-side room cleanup when empty
-- This removes the need for client-side cascading deletes

CREATE OR REPLACE FUNCTION public.cleanup_empty_room()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any players remain in the room
  IF NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = OLD.room_id) THEN
    -- Delete related data first (respecting foreign key constraints)
    DELETE FROM game_actions WHERE room_id = OLD.room_id;
    DELETE FROM votes WHERE room_id = OLD.room_id;
    DELETE FROM messages WHERE room_id = OLD.room_id;
    DELETE FROM game_state WHERE room_id = OLD.room_id;
    DELETE FROM kicked_players WHERE room_id = OLD.room_id;
    DELETE FROM rooms WHERE id = OLD.room_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after a player is deleted from room_players
DROP TRIGGER IF EXISTS trigger_cleanup_empty_room ON room_players;
CREATE TRIGGER trigger_cleanup_empty_room
  AFTER DELETE ON room_players
  FOR EACH ROW 
  EXECUTE FUNCTION cleanup_empty_room();

-- Fix 4: Restrict DELETE policies - only allow deleting non-game related data by clients
-- Block client deletes for critical game data (handled by trigger now)
DROP POLICY IF EXISTS "Anyone can delete game_actions" ON game_actions;
DROP POLICY IF EXISTS "Anyone can delete votes" ON votes;
DROP POLICY IF EXISTS "Anyone can delete messages" ON messages;
DROP POLICY IF EXISTS "Anyone can delete game_state" ON game_state;
DROP POLICY IF EXISTS "Anyone can delete kicked_players" ON kicked_players;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON rooms;

-- These tables should not be deletable by clients
CREATE POLICY "No client deletes on game_actions" ON game_actions 
  FOR DELETE 
  USING (false);

CREATE POLICY "No client deletes on votes" ON votes 
  FOR DELETE 
  USING (false);

CREATE POLICY "No client deletes on game_state" ON game_state 
  FOR DELETE 
  USING (false);

CREATE POLICY "No client deletes on messages" ON messages 
  FOR DELETE 
  USING (false);

CREATE POLICY "No client deletes on kicked_players" ON kicked_players 
  FOR DELETE 
  USING (false);

CREATE POLICY "No client deletes on rooms" ON rooms 
  FOR DELETE 
  USING (false);