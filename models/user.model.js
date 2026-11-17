const sql = require('../config/db'); // Adjust the path as necessary

const userModel = {
    getAll: async () => {
        try {
            const users = await sql`SELECT * FROM users`;
            return users;
        } catch (err) {
            console.error('Error fetching users:', err);
            throw new Error('Failed to fetch users');
        }
    },

    getById: async (id) => {
        try {
            const user = await sql`SELECT * FROM users WHERE id = ${id}`;
            return user[0] || null;
        } catch (err) {
            console.error('Error fetching user:', err);
            throw new Error('Failed to fetch user');
        }
    },

    findUserByUsername: async (username) => {
        try {
            const result = await sql`SELECT * FROM users WHERE username = ${username}`;
            return result[0];
        } catch (err) {
            console.error('Error finding user by username:', err);
            throw new Error('Failed to find user by username');
        }
    },

    create: async (userData) => {
        try {
            const result = await sql`INSERT INTO users ${sql(userData)} RETURNING *`;
            return result[0];
        } catch (err) {
            console.error('Error creating user:', err);
            throw new Error('Failed to create user');
        }
    },

    update: async (id, updatedData) => {
        try {
            const result = await sql`UPDATE users SET ${sql(updatedData)} WHERE id = ${id} RETURNING *`;
            return result[0];
        } catch (err) {
            console.error('Error updating user:', err);
            throw new Error('Failed to update user');
        }
    },

    delete: async (id) => {
        try {
            await sql`DELETE FROM users WHERE id = ${id}`;
            return {
                message: `User with ID: ${id} deleted successfully`
            };
        } catch (err) {
            console.error('Error deleting user:', err);
            throw new Error('Failed to delete user');
        }
    }
};

module.exports = userModel;