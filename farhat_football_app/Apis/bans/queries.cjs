const createBan = `
  INSERT INTO bans (player_id, host_id, banned_until, reason, ban_type, created_by)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

const liftBan = `
  UPDATE bans SET active = false WHERE ban_id = $1 RETURNING *;
`;

const getBanById = `SELECT * FROM bans WHERE ban_id = $1;`;

// Active bans that apply to a host — its own bans plus any global (host_id NULL)
// bans. Used for the visible "who's banned" list.
const listActiveBans = `
  SELECT b.ban_id, b.player_id, p.preferred_name,
         b.banned_until, b.reason, b.ban_type, b.host_id
  FROM bans b
  JOIN players p ON p.player_id = b.player_id
  WHERE b.active = true
    AND now() < b.banned_until
    AND (b.host_id = $1 OR b.host_id IS NULL)
  ORDER BY b.banned_until DESC;
`;

// A single player's current ban for a host (or nothing). Drives the join block
// and the account banner.
const getActiveBanForPlayer = `
  SELECT ban_id, banned_until, reason, ban_type, host_id
  FROM bans
  WHERE player_id = $1
    AND active = true
    AND now() < banned_until
    AND (host_id = $2 OR host_id IS NULL)
  ORDER BY banned_until DESC
  LIMIT 1;
`;

// Count a player's lates at a host within a window, but only those AFTER their
// most recent auto-ban — so the count resets after each auto-ban rather than
// re-triggering on the same lates.
const countRecentLates = `
  SELECT COUNT(*) AS lates
  FROM match_players mp
  JOIN matches m ON m.match_id = mp.match_id
  WHERE mp.player_id = $1
    AND m.host_id = $2
    AND mp.late = true
    AND m.match_date >= now() - ($3 || ' days')::interval
    AND m.match_date > COALESCE(
      (SELECT MAX(banned_from) FROM bans
       WHERE player_id = $1 AND ban_type = 'auto_late'
         AND (host_id = $2 OR host_id IS NULL)),
      '-infinity'::timestamptz
    );
`;

// All of a player's active bans across hosts (for their account banner).
const getAllActiveBansForPlayer = `
  SELECT b.ban_id, b.banned_until, b.reason, b.ban_type, b.host_id, h.name AS host_name
  FROM bans b
  LEFT JOIN hosts h ON h.host_id = b.host_id
  WHERE b.player_id = $1 AND b.active = true AND now() < b.banned_until
  ORDER BY b.banned_until DESC;
`;

// Does this player already have any active ban at this host?
const hasActiveBan = `
  SELECT 1 FROM bans
  WHERE player_id = $1 AND active = true AND now() < banned_until
    AND (host_id = $2 OR host_id IS NULL)
  LIMIT 1;
`;

module.exports = {
	createBan,
	liftBan,
	getBanById,
	listActiveBans,
	getActiveBanForPlayer,
	getAllActiveBansForPlayer,
	countRecentLates,
	hasActiveBan,
};
