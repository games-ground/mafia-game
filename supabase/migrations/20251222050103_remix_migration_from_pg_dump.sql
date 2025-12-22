CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


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
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


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
    CONSTRAINT rooms_night_mode_check CHECK ((night_mode = ANY (ARRAY['timed'::text, 'action_complete'::text])))
);


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
-- Name: game_state Anyone can create game_state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create game_state" ON public.game_state FOR INSERT WITH CHECK (true);


--
-- Name: messages Anyone can create messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create messages" ON public.messages FOR INSERT WITH CHECK (true);


--
-- Name: players Anyone can create players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create players" ON public.players FOR INSERT WITH CHECK (true);


--
-- Name: rooms Anyone can create rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);


--
-- Name: votes Anyone can create votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create votes" ON public.votes FOR INSERT WITH CHECK (true);


--
-- Name: room_players Anyone can join rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can join rooms" ON public.room_players FOR INSERT WITH CHECK (true);


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
-- Name: game_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: game_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

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