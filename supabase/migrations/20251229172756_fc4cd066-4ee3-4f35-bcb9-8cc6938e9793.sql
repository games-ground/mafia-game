-- Enable realtime for rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Enable realtime for room_players table
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- Enable realtime for game_state table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;

-- Enable realtime for votes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Set REPLICA IDENTITY FULL to get complete row data on updates
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.game_state REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;