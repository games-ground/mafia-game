CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: game_phase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.game_phase AS ENUM (
    'lobby',
    'night',
    'day_discussion',
    'day_voting',
    'game_over'
);


--
-- Name: role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_type AS ENUM (
    'mafia',
    'detective',
    'doctor',
    'civilian'
);


--
-- Name: cleanup_idle_rooms(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_idle_rooms(p_idle_minutes integer DEFAULT 60) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cutoff timestamptz;
  room_ids uuid[];
BEGIN
  cutoff := now() - make_interval(mins => p_idle_minutes);

  SELECT array_agg(r.id)
  INTO room_ids
  FROM rooms r
  LEFT JOIN game_state gs ON gs.room_id = r.id
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM messages m
    WHERE m.room_id = r.id
  ) msg ON true
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM votes v
    WHERE v.room_id = r.id
  ) vt ON true
  LEFT JOIN LATERAL (
    SELECT max(created_at) AS max_created_at
    FROM game_actions ga
    WHERE ga.room_id = r.id
  ) act ON true
  WHERE greatest(
    r.updated_at,
    r.created_at,
    coalesce(gs.updated_at, 'epoch'::timestamptz),
    coalesce(msg.max_created_at, 'epoch'::timestamptz),
    coalesce(vt.max_created_at, 'epoch'::timestamptz),
    coalesce(act.max_created_at, 'epoch'::timestamptz)
  ) < cutoff;

  IF room_ids IS NULL OR array_length(room_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete children first (FK order)
  DELETE FROM game_actions WHERE room_id = ANY(room_ids);
  DELETE FROM votes WHERE room_id = ANY(room_ids);
  DELETE FROM messages WHERE room_id = ANY(room_ids);
  DELETE FROM game_state WHERE room_id = ANY(room_ids);
  DELETE FROM room_players WHERE room_id = ANY(room_ids);
  DELETE FROM rooms WHERE id = ANY(room_ids);

  RETURN array_length(room_ids, 1);
END;
$$;


--
-- Name: get_mafia_partners(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_mafia_partners(p_player_id uuid, p_room_id uuid) RETURNS TABLE(room_player_id uuid, partner_player_id uuid, nickname text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only return if requesting player is mafia
  IF NOT EXISTS (
    SELECT 1 FROM room_players
    WHERE player_id = p_player_id
    AND room_id = p_room_id
    AND role = 'mafia'
  ) THEN
    RETURN;
  END IF;
  
  -- Return other mafia members
  RETURN QUERY
  SELECT rp.id, rp.player_id, p.nickname
  FROM room_players rp
  JOIN players p ON p.id = rp.player_id
  WHERE rp.room_id = p_room_id
  AND rp.role = 'mafia'
  AND rp.player_id != p_player_id;
END;
$$;


--
-- Name: get_own_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_own_role(p_player_id uuid, p_room_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  player_role text;
BEGIN
  SELECT role::text INTO player_role
  FROM room_players
  WHERE player_id = p_player_id
  AND room_id = p_room_id;
  
  RETURN player_role;
END;
$$;


--
-- Name: kick_player(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kick_player(p_host_player_id uuid, p_room_id uuid, p_target_room_player_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_room_host_id uuid;
  v_target_player_id uuid;
BEGIN
  -- Verify the caller is the host
  SELECT host_id INTO v_room_host_id FROM rooms WHERE id = p_room_id;
  
  IF v_room_host_id IS NULL OR v_room_host_id != p_host_player_id THEN
    RETURN false;
  END IF;
  
  -- Get the player_id of the target
  SELECT player_id INTO v_target_player_id FROM room_players WHERE id = p_target_room_player_id;
  
  IF v_target_player_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Add to kicked_players table to prevent rejoin
  INSERT INTO kicked_players (room_id, player_id)
  VALUES (p_room_id, v_target_player_id)
  ON CONFLICT (room_id, player_id) DO NOTHING;
  
  -- Delete the room_player entry
  DELETE FROM room_players WHERE id = p_target_room_player_id;
  
  RETURN true;
END;
$$;


--
-- Name: restart_game(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restart_game(p_host_player_id uuid, p_room_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  room_host_id uuid;
BEGIN
  SELECT host_id INTO room_host_id FROM rooms WHERE id = p_room_id;

  IF room_host_id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can restart the game';
  END IF;

  -- Put room back to lobby first so all clients immediately sync
  UPDATE rooms SET status = 'waiting' WHERE id = p_room_id;

  -- Clear all game-specific state for this room (order matters for FKs)
  DELETE FROM game_actions WHERE room_id = p_room_id;
  DELETE FROM votes WHERE room_id = p_room_id;
  DELETE FROM messages WHERE room_id = p_room_id;
  DELETE FROM game_state WHERE room_id = p_room_id;

  -- Reset players (keep them in the room)
  UPDATE room_players
    SET is_alive = true,
        role = NULL,
        is_ready = false
  WHERE room_id = p_room_id;

  -- Add fresh system message
  INSERT INTO messages (room_id, content, is_system, is_mafia_only, role_type)
  VALUES (p_room_id, '🔄 Game has been reset. Waiting for players to ready up...', true, false, NULL);

  RETURN true;
END;
$$;


--
-- Name: start_game(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_game(p_host_player_id uuid, p_room_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  room_host_id uuid;
  room_status text;
BEGIN
  -- Get room info
  SELECT host_id, status INTO room_host_id, room_status FROM rooms WHERE id = p_room_id;
  
  -- Verify starter is host
  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can start the game';
  END IF;
  
  -- Verify room is in waiting status
  IF room_status != 'waiting' THEN
    RAISE EXCEPTION 'Game already started or room not in waiting status';
  END IF;
  
  -- Update room status
  UPDATE rooms SET status = 'playing' WHERE id = p_room_id;
  
  RETURN true;
END;
$$;


--
-- Name: update_room_config(uuid, uuid, integer, integer, integer, text, integer, integer, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_room_config(p_host_player_id uuid, p_room_id uuid, p_mafia_count integer DEFAULT NULL::integer, p_doctor_count integer DEFAULT NULL::integer, p_detective_count integer DEFAULT NULL::integer, p_night_mode text DEFAULT NULL::text, p_day_duration integer DEFAULT NULL::integer, p_night_duration integer DEFAULT NULL::integer, p_show_vote_counts boolean DEFAULT NULL::boolean, p_reveal_roles_on_death boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  room_host_id uuid;
  room_status text;
BEGIN
  -- Get room info
  SELECT host_id, status INTO room_host_id, room_status FROM rooms WHERE id = p_room_id;
  
  -- Verify updater is host
  IF room_host_id != p_host_player_id THEN
    RAISE EXCEPTION 'Only host can update room config';
  END IF;
  
  -- Verify room is in waiting status
  IF room_status != 'waiting' THEN
    RAISE EXCEPTION 'Cannot update config after game has started';
  END IF;
  
  -- Update only provided fields
  UPDATE rooms SET
    mafia_count = COALESCE(p_mafia_count, mafia_count),
    doctor_count = COALESCE(p_doctor_count, doctor_count),
    detective_count = COALESCE(p_detective_count, detective_count),
    night_mode = COALESCE(p_night_mode, night_mode),
    day_duration = COALESCE(p_day_duration, day_duration),
    night_duration = COALESCE(p_night_duration, night_duration),
    show_vote_counts = COALESCE(p_show_vote_counts, show_vote_counts),
    reveal_roles_on_death = COALESCE(p_reveal_roles_on_death, reveal_roles_on_death)
  WHERE id = p_room_id;
  
  RETURN true;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: game_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    actor_id uuid,
    action_type text NOT NULL,
    target_id uuid,
    result text,
    day_number integer NOT NULL,
    phase public.game_phase NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: game_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    phase public.game_phase DEFAULT 'lobby'::public.game_phase NOT NULL,
    phase_end_time timestamp with time zone,
    day_number integer DEFAULT 0 NOT NULL,
    mafia_target_id uuid,
    doctor_target_id uuid,
    detective_target_id uuid,
    detective_result text,
    winner text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_mafia_target_name text,
    last_doctor_target_name text,
    last_detective_target_name text
);

ALTER TABLE ONLY public.game_state REPLICA IDENTITY FULL;


--
-- Name: kicked_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kicked_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    player_id uuid NOT NULL,
    kicked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    player_id uuid,
    content text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_mafia_only boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role_type text
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    browser_id text NOT NULL,
    nickname text DEFAULT 'Anonymous'::text NOT NULL,
    games_played integer DEFAULT 0 NOT NULL,
    games_won integer DEFAULT 0 NOT NULL,
    games_won_as_mafia integer DEFAULT 0 NOT NULL,
    games_won_as_civilian integer DEFAULT 0 NOT NULL,
    total_kills integer DEFAULT 0 NOT NULL,
    total_saves integer DEFAULT 0 NOT NULL,
    visittotal_investigations integer DEFAULT 0 NOT NULL,
    correct_investigations integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: room_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    player_id uuid NOT NULL,
    is_ready boolean DEFAULT false NOT NULL,
    role public.role_type,
    is_alive boolean DEFAULT true NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    kicked boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.room_players REPLICA IDENTITY FULL;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    host_id uuid,
    status text DEFAULT 'waiting'::text NOT NULL,
    min_players integer DEFAULT 4 NOT NULL,
    max_players integer DEFAULT 32 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mafia_count integer DEFAULT 1 NOT NULL,
    doctor_count integer DEFAULT 1 NOT NULL,
    detective_count integer DEFAULT 1 NOT NULL,
    night_mode text DEFAULT 'timed'::text NOT NULL,
    night_duration integer DEFAULT 30,
    day_duration integer DEFAULT 60,
    show_vote_counts boolean DEFAULT true NOT NULL,
    reveal_roles_on_death boolean DEFAULT true NOT NULL,
    CONSTRAINT rooms_night_mode_check CHECK ((night_mode = ANY (ARRAY['timed'::text, 'action_complete'::text])))
);

ALTER TABLE ONLY public.rooms REPLICA IDENTITY FULL;


--
-- Name: room_players_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.room_players_safe WITH (security_invoker='on') AS
 SELECT id,
    room_id,
    player_id,
    is_alive,
    is_ready,
    joined_at,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.game_state gs
              WHERE ((gs.room_id = rp.room_id) AND (gs.phase = 'game_over'::public.game_phase)))) THEN role
            WHEN ((NOT is_alive) AND (EXISTS ( SELECT 1
               FROM public.rooms r
              WHERE ((r.id = rp.room_id) AND (r.reveal_roles_on_death = true))))) THEN role
            ELSE NULL::public.role_type
        END AS role
   FROM public.room_players rp;


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    target_id uuid,
    day_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.votes REPLICA IDENTITY FULL;


--
-- Name: game_actions game_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_actions
    ADD CONSTRAINT game_actions_pkey PRIMARY KEY (id);


--
-- Name: game_state game_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_pkey PRIMARY KEY (id);


--
-- Name: game_state game_state_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_room_id_key UNIQUE (room_id);


--
-- Name: kicked_players kicked_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kicked_players
    ADD CONSTRAINT kicked_players_pkey PRIMARY KEY (id);


--
-- Name: kicked_players kicked_players_room_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kicked_players
    ADD CONSTRAINT kicked_players_room_id_player_id_key UNIQUE (room_id, player_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: players players_browser_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_browser_id_key UNIQUE (browser_id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: room_players room_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_players
    ADD CONSTRAINT room_players_pkey PRIMARY KEY (id);


--
-- Name: room_players room_players_room_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_players
    ADD CONSTRAINT room_players_room_id_player_id_key UNIQUE (room_id, player_id);


--
-- Name: rooms rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_code_key UNIQUE (code);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- Name: votes votes_room_id_voter_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_room_id_voter_id_day_number_key UNIQUE (room_id, voter_id, day_number);


--
-- Name: votes votes_unique_per_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_unique_per_day UNIQUE (room_id, voter_id, day_number);


--
-- Name: room_players_unique_per_room; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_players_unique_per_room ON public.room_players USING btree (room_id, player_id);


--
-- Name: game_state update_game_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON public.game_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: players update_players_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rooms update_rooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: game_actions game_actions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_actions
    ADD CONSTRAINT game_actions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: game_actions game_actions_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_actions
    ADD CONSTRAINT game_actions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: game_actions game_actions_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_actions
    ADD CONSTRAINT game_actions_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: game_state game_state_detective_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_detective_target_id_fkey FOREIGN KEY (detective_target_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: game_state game_state_doctor_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_doctor_target_id_fkey FOREIGN KEY (doctor_target_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: game_state game_state_mafia_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_mafia_target_id_fkey FOREIGN KEY (mafia_target_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: game_state game_state_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_state
    ADD CONSTRAINT game_state_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: kicked_players kicked_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kicked_players
    ADD CONSTRAINT kicked_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: kicked_players kicked_players_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kicked_players
    ADD CONSTRAINT kicked_players_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: messages messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: room_players room_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_players
    ADD CONSTRAINT room_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: room_players room_players_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_players
    ADD CONSTRAINT room_players_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: votes votes_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: votes votes_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.room_players(id) ON DELETE SET NULL;


--
-- Name: votes votes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.room_players(id) ON DELETE CASCADE;


--
-- Name: game_actions Anyone can create game_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create game_actions" ON public.game_actions FOR INSERT WITH CHECK (true);


--
-- Name: rooms Anyone can create rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);


--
-- Name: votes Anyone can create votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create votes" ON public.votes FOR INSERT WITH CHECK (true);


--
-- Name: room_players Anyone can leave rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can leave rooms" ON public.room_players FOR DELETE USING (true);


--
-- Name: game_actions Anyone can read game_actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read game_actions" ON public.game_actions FOR SELECT USING (true);


--
-- Name: game_state Anyone can read game_state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read game_state" ON public.game_state FOR SELECT USING (true);


--
-- Name: kicked_players Anyone can read kicked_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read kicked_players" ON public.kicked_players FOR SELECT USING (true);


--
-- Name: messages Anyone can read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);


--
-- Name: players Anyone can read players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);


--
-- Name: room_players Anyone can read room_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read room_players" ON public.room_players FOR SELECT USING (true);


--
-- Name: rooms Anyone can read rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);


--
-- Name: votes Anyone can read votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT USING (true);


--
-- Name: game_state Anyone can update game_state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update game_state" ON public.game_state FOR UPDATE USING (true);


--
-- Name: room_players Anyone can update room_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update room_players" ON public.room_players FOR UPDATE USING (true);


--
-- Name: rooms Anyone can update rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE USING (true);


--
-- Name: players Anyone can update their own player; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update their own player" ON public.players FOR UPDATE USING (true);


--
-- Name: votes Anyone can update votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update votes" ON public.votes FOR UPDATE USING (true);


--
-- Name: players Create player with valid defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create player with valid defaults" ON public.players FOR INSERT WITH CHECK (((games_played = 0) AND (games_won = 0) AND (games_won_as_civilian = 0) AND (games_won_as_mafia = 0) AND (total_kills = 0) AND (total_saves = 0) AND (correct_investigations = 0) AND (visittotal_investigations = 0)));


--
-- Name: game_state Create valid game state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create valid game state" ON public.game_state FOR INSERT WITH CHECK (((NOT (EXISTS ( SELECT 1
   FROM public.game_state gs
  WHERE (gs.room_id = game_state.room_id)))) AND (phase = 'night'::public.game_phase) AND (day_number = 1)));


--
-- Name: messages Create valid messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Create valid messages" ON public.messages FOR INSERT WITH CHECK ((((is_system = false) AND (player_id IS NOT NULL)) OR ((is_system = true) AND (player_id IS NULL))));


--
-- Name: room_players Join valid rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Join valid rooms" ON public.room_players FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.rooms
  WHERE ((rooms.id = room_players.room_id) AND (rooms.status = 'waiting'::text)))) AND (role IS NULL) AND (is_ready = false) AND (is_alive = true)));


--
-- Name: kicked_players No direct inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct inserts" ON public.kicked_players FOR INSERT WITH CHECK (false);


--
-- Name: game_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: game_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

--
-- Name: kicked_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kicked_players ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: room_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

--
-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;