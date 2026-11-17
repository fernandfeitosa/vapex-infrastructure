const sql = require('../config/db');



module.exports = {

    getWalletById: async (id) => {
        const result = await sql`
            SELECT *
            FROM wallets
            WHERE user_id = ${id}
        `;
        return result[0];
    },

    createWallet: async (data) => {
        const result = await sql`
            INSERT INTO wallets (user_id, balance)
            VALUES (${data.user_id}, ${data.balance})
            RETURNING *
        `;
        return result[0];
    },

    updateWallet: async (id, data) => {
        const result = await sql`
            UPDATE wallets
            SET balance = ${data.balance}
            WHERE id = ${id}
            RETURNING *
        `;
        return result[0];
    },

    deposit: async (id, amount) => {
        const result = await sql`
            UPDATE wallets
            SET balance = balance + ${amount}
            WHERE user_id = ${id}
            RETURNING *
        `;
        return result[0];
    },
    
    getBalance: async (id) => {
        const result = await sql`
            SELECT balance FROM wallets WHERE user_id = ${id}
        `;
        return result[0];
    }
};