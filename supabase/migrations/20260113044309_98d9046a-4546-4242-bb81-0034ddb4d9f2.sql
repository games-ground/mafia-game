-- Fix profiles table SELECT policy to only allow users to read their own profile
-- The profiles_public view (which hides email) should be used for public access

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that only allows users to read their own profile
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Also restrict the players table to hide browser_id from public queries
-- Only the player with matching browser_id should see their own full record
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;

-- Create a policy that only allows players to see their own browser_id
-- Other players can be seen but without browser_id (use players_public view)
CREATE POLICY "Players can read their own record"
ON public.players
FOR SELECT
USING (browser_id = browser_id); -- This always evaluates to true, but we'll use the view for public access

-- Actually, we need to block direct SELECT on players table and force use of view
-- Let's create a more restrictive approach
DROP POLICY IF EXISTS "Players can read their own record" ON public.players;

-- Block all direct reads - force use of players_public view
CREATE POLICY "Block direct player reads"
ON public.players
FOR SELECT
USING (false);