-- ============================================================================
-- Record every roster join and leave (match_player_events)
-- ----------------------------------------------------------------------------
-- Leaving a match deletes the match_players row. A leave inside the charge
-- window leaves a trace (the match_exit_<match>_<player> payment), but an early
-- leave left none, so "when did this player leave?" had no answer.
--
-- A trigger on match_players records each INSERT as 'joined' and each DELETE
-- as 'left'. Doing it in the database rather than in each controller means it
-- covers every path that changes a roster: the join and leave endpoints, the
-- unused DELETE /matchPlayer route, reserves dropped at finalisation, and rows
-- inserted or deleted by hand in psql.
--
-- A roster row removed because its MATCH was deleted (the ON DELETE CASCADE
-- from matches) is recorded as 'match_deleted': by the time the cascade fires
-- the trigger, the matches row is already gone, which is how it is told apart.
--
-- Deliberately NO foreign keys. The history must outlive what it describes, and
-- an FK to matches would make that cascade insert a row pointing at a match
-- being deleted — failing the delete itself.
--
-- occurred_at is timestamptz (an absolute instant), unlike the older
-- timestamp-without-time-zone columns, so no UTC/BST conversion is needed to
-- read it.
--
-- Known limitation: reserves dropped at finalisation are recorded as 'left'
-- (with team_id 0) — the trigger cannot see why a row was deleted.
--
-- Existing rosters are backfilled as 'joined' at match_players.joined_at, so
-- joins that predate this migration are answerable too. Leaves before it are
-- not recoverable.
--
-- ROLLBACK
-- --------
--   DROP TRIGGER IF EXISTS trg_match_player_events ON public.match_players;
--   DROP FUNCTION IF EXISTS public.record_match_player_event();
--   DROP TABLE IF EXISTS public.match_player_events;
--   DELETE FROM public.schema_migrations WHERE version = '0003';
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_player_events (
	event_id    bigserial PRIMARY KEY,
	match_id    integer     NOT NULL,
	player_id   integer     NOT NULL,
	event       text        NOT NULL
		CHECK (event IN ('joined', 'left', 'match_deleted')),
	team_id     integer,
	occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_player_events_match_idx
	ON public.match_player_events (match_id, occurred_at);
CREATE INDEX IF NOT EXISTS match_player_events_player_idx
	ON public.match_player_events (player_id, occurred_at);

CREATE OR REPLACE FUNCTION public.record_match_player_event() RETURNS trigger
	LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		INSERT INTO public.match_player_events (match_id, player_id, event, team_id)
		VALUES (NEW.match_id, NEW.player_id, 'joined', NEW.team_id);
		RETURN NEW;
	END IF;

	INSERT INTO public.match_player_events (match_id, player_id, event, team_id)
	VALUES (
		OLD.match_id,
		OLD.player_id,
		CASE
			WHEN EXISTS (SELECT 1 FROM public.matches m WHERE m.match_id = OLD.match_id)
				THEN 'left'
			ELSE 'match_deleted'
		END,
		OLD.team_id
	);
	RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_player_events ON public.match_players;
CREATE TRIGGER trg_match_player_events
AFTER INSERT OR DELETE ON public.match_players
FOR EACH ROW EXECUTE FUNCTION public.record_match_player_event();

-- joined_at is timestamp-without-time-zone written by the server in UTC.
INSERT INTO public.match_player_events (match_id, player_id, event, team_id, occurred_at)
SELECT mp.match_id, mp.player_id, 'joined', mp.team_id, mp.joined_at AT TIME ZONE 'UTC'
FROM public.match_players mp
WHERE mp.joined_at IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM public.match_player_events e
		WHERE e.match_id = mp.match_id
			AND e.player_id = mp.player_id
			AND e.event = 'joined'
	);
