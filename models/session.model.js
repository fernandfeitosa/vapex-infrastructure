const sql = require('../config/db');
const { getAll } = require('./user.model');

const sessionModel = {
    create: async (data) => {
        const result = await sql`
            INSERT INTO sessions (host_id, user_id, duration_minutes, status,created_at)
            VALUES (${data.host_id}, ${data.user_id}, ${data.duration_minutes}, ${data.status}, DATE(NOW()))
            RETURNING *
        `;
        return result[0];
    },

    update: async (id, data = {}) => {
        const columnMap = {
            endedAt: 'ended_at',
            createdAt: 'created_at'
        };

        const entries = Object.entries(data).filter(([, value]) => value !== undefined && value !== null);
        if (entries.length === 0) {
            return null;
        }

        const [firstKey, firstValue] = entries[0];
        const firstColumn = columnMap[firstKey] || firstKey;
        let query = sql`UPDATE sessions SET ${sql.unsafe(firstColumn)} = ${firstValue}`;

        for (const [key, value] of entries.slice(1)) {
            const column = columnMap[key] || key;
            query = sql`${query}, ${sql.unsafe(column)} = ${value}`;
        }

        const result = await sql`${query} WHERE id = ${id} RETURNING *`;
        return result[0];
    },

    getAllActive: async (id) => {
        const result = await sql`
            SELECT *
            FROM sessions
            WHERE user_id = ${id} AND status = 'ACTIVE'
        `;
        return result;
    },

    findActiveByUser: async (id) => {
        const result = await sql`
            SELECT *
            FROM sessions
            WHERE user_id = ${id} AND status = 'ACTIVE'
        `;
        return result[0];
    }
};

module.exports = sessionModel;