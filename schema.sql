--
-- PostgreSQL database dump
--
-- BASELINE for the migration runner (DB-001): this file is version 0000, the
-- starting point every environment shares. Apply it with
--   npm run migrate:provision      (empty database)
--   npm run migrate:baseline       (existing database that already matches it)
-- and make every later change a numbered file in farhat_football_app/migrations/.
--
-- Regenerate with pg_dump 16.x to match the server major. pg_dump 17 emits
-- `SET transaction_timeout = 0`, a parameter PostgreSQL 16 does not have, which
-- aborts the load; that line was removed here for exactly that reason.
--

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 17.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: apply_payment_to_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_payment_to_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    rows_updated int;
BEGIN
    UPDATE players
    SET account_balance = COALESCE(account_balance, 0) + NEW.amount
    WHERE player_id = NEW.user_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    INSERT INTO trigger_log(user_id, amount, transaction_id, rows_updated)
    VALUES (NEW.user_id, NEW.amount, NEW.transaction_id, rows_updated);

    RETURN NEW;
END;
$$;


--
-- Name: create_attributes_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_attributes_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO attributes (player_id)
    VALUES (NEW.player_id);
    RETURN NEW;
END;
$$;


--
-- Name: generate_match_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_match_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.match_name := (
        SELECT CONCAT(
            (SELECT pitch_name FROM pitches WHERE pitches.pitch_id = NEW.pitch_id),
            '-', 
            NEW.number_of_players, 's-', 
            TO_CHAR(NEW.match_date, 'DDMMYY')
        )
    );
    RETURN NEW;
END;
$$;


--
-- Name: log_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO audit_log (
        user_name,
        table_name,
        column_name,
        old_value,
        new_value,
        query
    )
    VALUES (
        current_user,
        TG_TABLE_NAME,
        'account_balance',
        OLD.account_balance::TEXT,
        NEW.account_balance::TEXT,
        current_query()
    );
    RETURN NEW;
END;
$$;


--
-- Name: set_first_player_as_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_first_player_as_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if there is no admin yet in the players table
    IF NOT EXISTS (SELECT 1 FROM players WHERE is_admin = TRUE) THEN
        -- Set the is_admin column to TRUE
        NEW.is_admin := TRUE;
    END IF;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributes (
    player_id integer NOT NULL,
    dribbling integer DEFAULT 0,
    finishing integer DEFAULT 0,
    first_touch integer DEFAULT 0,
    long_shots integer DEFAULT 0,
    movement integer DEFAULT 0,
    short_passing integer DEFAULT 0,
    long_passing integer DEFAULT 0,
    vision integer DEFAULT 0,
    tackling integer DEFAULT 0,
    positioning integer DEFAULT 0,
    marking integer DEFAULT 0,
    aggression integer DEFAULT 0,
    concentration integer DEFAULT 0,
    decision_making integer DEFAULT 0,
    leadership integer DEFAULT 0,
    consistency integer DEFAULT 0,
    stamina integer DEFAULT 0,
    pace integer DEFAULT 0,
    strength integer DEFAULT 0,
    workrate integer DEFAULT 0,
    teamwork integer DEFAULT 0,
    mental integer DEFAULT 0,
    goalkeeping integer DEFAULT 0,
    CONSTRAINT attributes_aggression_check CHECK (((aggression >= 0) AND (aggression <= 100))),
    CONSTRAINT attributes_concentration_check CHECK (((concentration >= 0) AND (concentration <= 100))),
    CONSTRAINT attributes_consistency_check CHECK (((consistency >= 0) AND (consistency <= 100))),
    CONSTRAINT attributes_decision_making_check CHECK (((decision_making >= 0) AND (decision_making <= 100))),
    CONSTRAINT attributes_dribbling_check CHECK (((dribbling >= 0) AND (dribbling <= 100))),
    CONSTRAINT attributes_finishing_check CHECK (((finishing >= 0) AND (finishing <= 100))),
    CONSTRAINT attributes_first_touch_check CHECK (((first_touch >= 0) AND (first_touch <= 100))),
    CONSTRAINT attributes_goalkeeping_check CHECK (((goalkeeping >= 0) AND (goalkeeping <= 100))),
    CONSTRAINT attributes_leadership_check CHECK (((leadership >= 0) AND (leadership <= 100))),
    CONSTRAINT attributes_long_passing_check CHECK (((long_passing >= 0) AND (long_passing <= 100))),
    CONSTRAINT attributes_long_shots_check CHECK (((long_shots >= 0) AND (long_shots <= 100))),
    CONSTRAINT attributes_marking_check CHECK (((marking >= 0) AND (marking <= 100))),
    CONSTRAINT attributes_mentals_check CHECK (((mental >= 0) AND (mental <= 100))),
    CONSTRAINT attributes_movement_check CHECK (((movement >= 0) AND (movement <= 100))),
    CONSTRAINT attributes_pace_check CHECK (((pace >= 0) AND (pace <= 100))),
    CONSTRAINT attributes_positioning_check CHECK (((positioning >= 0) AND (positioning <= 100))),
    CONSTRAINT attributes_short_passing_check CHECK (((short_passing >= 0) AND (short_passing <= 100))),
    CONSTRAINT attributes_stamina_check CHECK (((stamina >= 0) AND (stamina <= 100))),
    CONSTRAINT attributes_strength_check CHECK (((strength >= 0) AND (strength <= 100))),
    CONSTRAINT attributes_tackling_check CHECK (((tackling >= 0) AND (tackling <= 100))),
    CONSTRAINT attributes_teamwork_check CHECK (((teamwork >= 0) AND (teamwork <= 100))),
    CONSTRAINT attributes_vision_check CHECK (((vision >= 0) AND (vision <= 100))),
    CONSTRAINT attributes_workrate_check CHECK (((workrate >= 0) AND (workrate <= 100)))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    operation_time timestamp without time zone DEFAULT now(),
    user_name text,
    table_name text,
    column_name text,
    old_value text,
    new_value text,
    query text
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bans (
    ban_id integer NOT NULL,
    player_id integer NOT NULL,
    host_id integer,
    banned_from timestamp with time zone DEFAULT now(),
    banned_until timestamp with time zone NOT NULL,
    reason text,
    ban_type character varying DEFAULT 'manual'::character varying,
    created_by integer,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bans_ban_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bans_ban_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bans_ban_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bans_ban_id_seq OWNED BY public.bans.ban_id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    feedback_id integer NOT NULL,
    user_id integer,
    name character varying(100),
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_anonymous boolean DEFAULT false
);


--
-- Name: feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_feedback_id_seq OWNED BY public.feedback.feedback_id;


--
-- Name: host_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.host_admins (
    host_id integer NOT NULL,
    player_id integer NOT NULL
);


--
-- Name: hosts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hosts (
    host_id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: hosts_host_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hosts_host_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hosts_host_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hosts_host_id_seq OWNED BY public.hosts.host_id;


--
-- Name: match_player_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_player_ratings (
    match_id integer NOT NULL,
    rater_id integer NOT NULL,
    ratee_id integer NOT NULL,
    rating numeric(3,1),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_player_ratings_rating_check CHECK (((rating >= (1)::numeric) AND (rating <= (10)::numeric)))
);


--
-- Name: match_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_players (
    match_id integer NOT NULL,
    player_id integer NOT NULL,
    goals integer DEFAULT 0,
    assists integer DEFAULT 0,
    late boolean DEFAULT false,
    price double precision NOT NULL,
    team_id integer,
    joined_at timestamp without time zone DEFAULT now(),
    own_goals integer DEFAULT 0,
    defcons integer DEFAULT 0,
    chancescreated integer DEFAULT 0,
    rating numeric(3,1),
    CONSTRAINT match_players_assists_check CHECK ((assists >= 0)),
    CONSTRAINT match_players_chancescreated_check CHECK ((chancescreated >= 0)),
    CONSTRAINT match_players_defcons_check CHECK ((defcons >= 0)),
    CONSTRAINT match_players_goals_check CHECK ((goals >= 0)),
    CONSTRAINT match_players_rating_check CHECK (((rating IS NULL) OR ((rating >= (1)::numeric) AND (rating <= (10)::numeric)))),
    CONSTRAINT match_players_team_id_check CHECK ((team_id = ANY (ARRAY[0, 1, 2])))
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    match_id integer NOT NULL,
    match_date date NOT NULL,
    match_time time without time zone NOT NULL,
    price double precision NOT NULL,
    number_of_players integer NOT NULL,
    pitch_id integer NOT NULL,
    match_status character varying(15) NOT NULL,
    match_name character varying(50),
    youtube_links text,
    man_of_the_match integer,
    winning_team integer,
    host_id integer,
    CONSTRAINT matches_number_of_players_check CHECK ((number_of_players > 0)),
    CONSTRAINT matches_winning_team_check CHECK ((winning_team = ANY (ARRAY[1, 2])))
);


--
-- Name: matches_match_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matches_match_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matches_match_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matches_match_id_seq OWNED BY public.matches.match_id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id integer NOT NULL,
    user_id integer,
    amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    transaction_id character varying(50) NOT NULL,
    description character varying(100),
    processed boolean DEFAULT false
);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_payment_id_seq OWNED BY public.payments.payment_id;


--
-- Name: pitches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pitches (
    pitch_id integer NOT NULL,
    pitch_name character varying(30) NOT NULL,
    pitch_number integer,
    address character varying(50),
    postcode character varying(8),
    price double precision NOT NULL,
    CONSTRAINT pitches_postcode_check CHECK (((postcode)::text ~ '^[A-Z0-9 ]{5,8}$'::text)),
    CONSTRAINT pitches_price_check CHECK ((price > (0)::double precision))
);


--
-- Name: pitches_pitch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pitches_pitch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pitches_pitch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pitches_pitch_id_seq OWNED BY public.pitches.pitch_id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    player_id integer NOT NULL,
    first_name character varying(30) NOT NULL,
    last_name character varying(30) NOT NULL,
    preferred_name character varying(20),
    year_of_birth integer NOT NULL,
    email character varying(50) NOT NULL,
    account_balance numeric(10,2) DEFAULT 0,
    is_admin boolean DEFAULT false,
    is_superadmin boolean DEFAULT false,
    CONSTRAINT check_year_of_birth CHECK (((year_of_birth > 1970) AND (year_of_birth < 2009)))
);


--
-- Name: players_player_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.players_player_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: players_player_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.players_player_id_seq OWNED BY public.players.player_id;


--
-- Name: replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.replies (
    reply_id integer NOT NULL,
    feedback_id integer,
    user_id integer,
    name character varying(100),
    reply_content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: replies_reply_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.replies_reply_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: replies_reply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.replies_reply_id_seq OWNED BY public.replies.reply_id;


--
-- Name: trigger_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trigger_log (
    id integer NOT NULL,
    fired_at timestamp with time zone DEFAULT now(),
    user_id integer,
    amount numeric,
    transaction_id text,
    rows_updated integer
);


--
-- Name: trigger_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trigger_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trigger_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trigger_log_id_seq OWNED BY public.trigger_log.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: bans ban_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans ALTER COLUMN ban_id SET DEFAULT nextval('public.bans_ban_id_seq'::regclass);


--
-- Name: feedback feedback_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.feedback_feedback_id_seq'::regclass);


--
-- Name: hosts host_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hosts ALTER COLUMN host_id SET DEFAULT nextval('public.hosts_host_id_seq'::regclass);


--
-- Name: matches match_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches ALTER COLUMN match_id SET DEFAULT nextval('public.matches_match_id_seq'::regclass);


--
-- Name: payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN payment_id SET DEFAULT nextval('public.payments_payment_id_seq'::regclass);


--
-- Name: pitches pitch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitches ALTER COLUMN pitch_id SET DEFAULT nextval('public.pitches_pitch_id_seq'::regclass);


--
-- Name: players player_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players ALTER COLUMN player_id SET DEFAULT nextval('public.players_player_id_seq'::regclass);


--
-- Name: replies reply_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replies ALTER COLUMN reply_id SET DEFAULT nextval('public.replies_reply_id_seq'::regclass);


--
-- Name: trigger_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trigger_log ALTER COLUMN id SET DEFAULT nextval('public.trigger_log_id_seq'::regclass);


--
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (player_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bans bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_pkey PRIMARY KEY (ban_id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: host_admins host_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.host_admins
    ADD CONSTRAINT host_admins_pkey PRIMARY KEY (host_id, player_id);


--
-- Name: hosts hosts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hosts
    ADD CONSTRAINT hosts_pkey PRIMARY KEY (host_id);


--
-- Name: hosts hosts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hosts
    ADD CONSTRAINT hosts_slug_key UNIQUE (slug);


--
-- Name: match_player_ratings match_player_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_player_ratings
    ADD CONSTRAINT match_player_ratings_pkey PRIMARY KEY (match_id, rater_id, ratee_id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (match_id, player_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (match_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: pitches pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_pkey PRIMARY KEY (pitch_id);


--
-- Name: players players_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_email_key UNIQUE (email);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (player_id);


--
-- Name: replies replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_pkey PRIMARY KEY (reply_id);


--
-- Name: trigger_log trigger_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trigger_log
    ADD CONSTRAINT trigger_log_pkey PRIMARY KEY (id);


--
-- Name: idx_bans_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bans_player ON public.bans USING btree (player_id);


--
-- Name: idx_match_players_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_players_match ON public.match_players USING btree (match_id);


--
-- Name: idx_match_players_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_players_player ON public.match_players USING btree (player_id);


--
-- Name: idx_matches_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_date ON public.matches USING btree (match_date);


--
-- Name: idx_matches_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_host ON public.matches USING btree (host_id);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (match_status);


--
-- Name: idx_payments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user ON public.payments USING btree (user_id);


--
-- Name: players account_balance_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER account_balance_audit AFTER UPDATE OF account_balance ON public.players FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: players add_attributes_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER add_attributes_trigger AFTER INSERT ON public.players FOR EACH ROW EXECUTE FUNCTION public.create_attributes_row();


--
-- Name: matches match_name_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER match_name_trigger BEFORE INSERT OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.generate_match_name();


--
-- Name: payments trg_apply_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_apply_payment AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.apply_payment_to_balance();


--
-- Name: attributes attributes_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: bans bans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.players(player_id);


--
-- Name: bans bans_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.hosts(host_id) ON DELETE CASCADE;


--
-- Name: bans bans_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.players(player_id) ON DELETE SET NULL;


--
-- Name: host_admins host_admins_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.host_admins
    ADD CONSTRAINT host_admins_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.hosts(host_id) ON DELETE CASCADE;


--
-- Name: host_admins host_admins_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.host_admins
    ADD CONSTRAINT host_admins_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: match_player_ratings match_player_ratings_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_player_ratings
    ADD CONSTRAINT match_player_ratings_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(match_id) ON DELETE CASCADE;


--
-- Name: match_player_ratings match_player_ratings_ratee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_player_ratings
    ADD CONSTRAINT match_player_ratings_ratee_id_fkey FOREIGN KEY (ratee_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: match_player_ratings match_player_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_player_ratings
    ADD CONSTRAINT match_player_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: match_players match_players_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(match_id) ON DELETE CASCADE;


--
-- Name: match_players match_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(player_id) ON DELETE CASCADE;


--
-- Name: matches matches_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.hosts(host_id);


--
-- Name: matches matches_man_of_the_match_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_man_of_the_match_fkey FOREIGN KEY (man_of_the_match) REFERENCES public.players(player_id);


--
-- Name: matches matches_pitch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pitch_id_fkey FOREIGN KEY (pitch_id) REFERENCES public.pitches(pitch_id) ON DELETE SET NULL;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.players(player_id);


--
-- Name: replies replies_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback(feedback_id) ON DELETE CASCADE;


--
-- Name: replies replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.players(player_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

