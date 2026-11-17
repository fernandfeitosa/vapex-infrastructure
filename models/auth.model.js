const sql = require('../config/db'); 

module.exports = {
    findUserByEmail: async (email) => {
        const result = await sql`
            SELECT *
            FROM users
            WHERE email = ${email}
        `;

        return result[0];
    },

    findUserById: async (id) => {
        const result = await sql`
            SELECT *
            FROM users
            WHERE id = ${id}
        `;  

        return result[0];
    },


    
    createUser: async (username, email, password_hash = null, email_token = null, avatar = null, emailVerified = false, refreshToken = null) => {
        const result = await sql`
            INSERT INTO users (
                username,
                email,
                password_hash,
                avatar,
                email_token,
                email_verified,
                refresh_token,
                created_at,
                updated_at
            )
            VALUES (
                ${username},
                ${email},
                ${password_hash},
                ${avatar},
                ${email_token},
                ${emailVerified},
                ${refreshToken},
                NOW(),
                NOW()   
            )
            RETURNING id, username, email, avatar, email_verified, refresh_token
        
        `;

        return result[0];
    },

    saveGoogleRefreshToken: async (id, refreshToken) => {
        const result = await sql`
            UPDATE users
            SET refresh_token = ${refreshToken},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id
        `;

        return result[0];
    },

    updateUserProfile: async (id, username, avatarUrl) => {
        const result = await sql`
            UPDATE users
            SET username = ${username},
                avatar = ${avatarUrl},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, username, avatar
        `;

        return result[0];
    },

    updateUserAvatar: async (id, avatarUrl) => {
        const result = await sql`
            UPDATE users
            SET avatar = ${avatarUrl},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id
        `;

        return result[0];
    },

    updateEmailVerified: async (id) => {
        const result = await sql`
            UPDATE users
            SET email_verified = true
            WHERE id = ${id}
        `;

        return result[0];
    },

};