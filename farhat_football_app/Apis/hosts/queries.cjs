const createHost = `
  INSERT INTO hosts (name, slug)
  VALUES ($1, $2)
  RETURNING *;
`;

const listHosts = `
  SELECT h.*, COUNT(ha.player_id) AS admin_count
  FROM hosts h
  LEFT JOIN host_admins ha ON ha.host_id = h.host_id
  GROUP BY h.host_id
  ORDER BY h.name;
`;

const getHostBySlug = `
  SELECT host_id, name, slug FROM hosts WHERE slug = $1;
`;

const getHostAdmins = `
  SELECT p.player_id, p.preferred_name, p.email
  FROM host_admins ha
  JOIN players p ON p.player_id = ha.player_id
  WHERE ha.host_id = $1
  ORDER BY p.preferred_name;
`;

const addHostAdmin = `
  INSERT INTO host_admins (host_id, player_id)
  VALUES ($1, $2)
  ON CONFLICT (host_id, player_id) DO NOTHING
  RETURNING *;
`;

const removeHostAdmin = `
  DELETE FROM host_admins WHERE host_id = $1 AND player_id = $2;
`;

// Portals relevant to a player: ones they administer, plus ones they've
// actually played in. can_admin distinguishes the two (bool_or so an admin who
// also plays there still comes back as an admin).
const getMyPortals = `
  SELECT h.host_id, h.name, h.slug, bool_or(x.can_admin) AS can_admin
  FROM (
    SELECT ha.host_id, true AS can_admin
    FROM host_admins ha
    WHERE ha.player_id = $1

    UNION ALL

    SELECT m.host_id, false AS can_admin
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.match_id
    WHERE mp.player_id = $1 AND m.host_id IS NOT NULL
  ) x
  JOIN hosts h ON h.host_id = x.host_id
  GROUP BY h.host_id, h.name, h.slug
  ORDER BY h.name;
`;

const getPlayerByEmail = `SELECT player_id FROM players WHERE email = $1;`;

module.exports = {
	createHost,
	listHosts,
	getHostBySlug,
	getHostAdmins,
	addHostAdmin,
	removeHostAdmin,
	getMyPortals,
	getPlayerByEmail,
};
