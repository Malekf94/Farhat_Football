-- ============================================================================
-- Performance indexes
-- ----------------------------------------------------------------------------
-- Foreign-key columns are NOT indexed automatically in PostgreSQL. These
-- indexes speed up the stats aggregations, leaderboards, payment lookups and
-- match-by-date filters that currently do sequential scans.
--
-- Safe to run multiple times (IF NOT EXISTS). Run once on the Render DB.
-- ============================================================================

-- Player stats / career aggregations (WHERE mp.player_id = ...)
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- Joins between match_players and matches, and per-match player counts
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);

-- Payment history per player and the balance reconciliation queries
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- Match list filtering/ordering by date (leaderboards, matches page)
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);

-- Match status filtering (matches page toggles, leaderboard WHERE completed)
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(match_status);
