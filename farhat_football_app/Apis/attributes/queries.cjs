const getLeadingAttributes = `SELECT a.player_id, p.preferred_name, a.attribute
FROM attributes a
JOIN players p ON a.player_id = p.player_id
WHERE a.attribute = $1
ORDER BY a.attribute DESC
LIMIT 10;

`;

module.exports = {};
