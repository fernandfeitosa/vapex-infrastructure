const sql = require('../config/db');

module.exports = {
    getUserAndWallet: (id) => sql`
    SELECT
        u.id,
        u.username,
        u.avatar,
        json_build_object(
            'id', w.id,
            'balance', w.balance,
            'user_id', w.user_id
        ) AS wallet
    FROM users u
    LEFT JOIN wallets w
        ON w.user_id = u.id
    WHERE u.id = ${id}
`
}