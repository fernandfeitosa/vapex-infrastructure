const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require('../../models/auth.model');
const { exchangeAuthCodeForTokens } = require('../../services/google/drive.service');

module.exports = async (email, password, googleAuthCode) => {
    try {
        if (!email || (!password && !googleAuthCode)) {
            return { status: 400, message: 'Email e senha ou googleAuthCode obrigatórios ❌' };
        }

        const user = await authModel.findUserByEmail(email);
        if (!user) {
            return { status: 404, message: 'Usuário não encontrado ❌' };
        }

        if (googleAuthCode) {
            const googleTokens = await exchangeAuthCodeForTokens(googleAuthCode);
            if (!googleTokens.refreshToken) {
                return {
                    status: 400,
                    message: 'Não foi possível obter o refresh token do Google. Verifique o CLIENT_ID/CLIENT_SECRET e o escopo drive.file.'
                };
            }

            if (!user.refresh_token) {
                await authModel.saveGoogleRefreshToken(user.id, googleTokens.refreshToken);
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return {
                status: 200,
                message: 'Login realizado com sucesso 🎉',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    email_verified: user.email_verified
                }
            };
        }

        if(user.email_verified === false || user.email_verified === null) {
            return { status: 403, message : 'Email não verificado ❌'};
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return { status: 401, message: 'Senha incorreta ❌' };
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return {
            status: 200,
            message: 'Login realizado com sucesso 🎉',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                email_verified: user.email_verified
            }
        };
    } catch (err) {
        console.error('Signin error:', err);
        return { status : 500, message : 'Erro interno do servidor ❌' };
    }
};