-- Fix security definer views by setting them to SECURITY INVOKER
-- This ensures they respect the RLS policies of the querying user

-- Recreate players_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  nickname,
  games_played,
  games_won,
  games_won_as_mafia,
  games_won_as_civilian,
  total_kills,
  total_saves,
  correct_investigations,
  visittotal_investigations,
  profile_id,
  created_at,
  updated_at
FROM players;

-- Recreate profiles_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  games_played,
  games_won,
  games_won_as_mafia,
  games_won_as_civilian,
  total_kills,
  total_saves,
  correct_investigations,
  total_investigations,
  is_premium,
  created_at,
  updated_at
FROM profiles;