const bcrypt = require('bcrypt');
const authModel = require('../../models/auth.model');
const walletModel = require('../../models/wallets.model');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../services/emailvalide.service');
const { exchangeAuthCodeForTokens } = require('../../services/google/drive.service');

module.exports = async (username, email, password, avatar, googleAuthCode) => {
    try {
        if (!username || !email || !password || !googleAuthCode) {
            return {
                status: 400,
                message: 'Username, email, password e googleAuthCode são obrigatórios ❌'
            };
        }

        if (password.length < 6) {
            return {
                status: 400,
                message: 'Senha precisa ter pelo menos 6 caracteres ❌'
            };
        }

        if (username.length < 3) {
            return {
                status: 400,
                message: 'Username precisa ter pelo menos 3 caracteres ❌'
            };
        }

        if (username.length > 20) {
            return {
                status: 400,
                message: 'Username precisa ter menos de 20 caracteres ❌'
            };
        }

        if (email.length < 3) {
            return {
                status: 400,
                message: 'E-mail precisa ter pelo menos 3 caracteres ❌'
            };
        }

        if (email.length > 254) {
            return {
                status: 400,
                message: 'E-mail precisa ter menos de 254 caracteres ❌'
            };
        }

        if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            return {
                status: 400,
                message: 'E-mail inválido ❌'
            };
        }

        const existingUser = await authModel.findUserByEmail(email);
        if (existingUser) {
            return {
                status: 409,
                message: 'E-mail já cadastrado no sistema ❌'
            };
        }

        const googleTokens = await exchangeAuthCodeForTokens(googleAuthCode);
        if (!googleTokens.refreshToken) {
            return {
                status: 400,
                message: 'Não foi possível obter o refresh token do Google. Verifique o CLIENT_ID/CLIENT_SECRET e o escopo drive.file.'
            };
        }

        const password_hash = await bcrypt.hash(password, 10);
        const email_token = await jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const user = await authModel.createUser(username, email, password_hash, email_token, avatar);

        if (user && googleTokens.refreshToken) {
            await authModel.saveGoogleRefreshToken(user.id, googleTokens.refreshToken);
        }

        await walletModel.createWallet({
            user_id: user.id,
            balance: 0.00,
            Wallet: 'BRL',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        

        if(user !== null) {
            try {
                await sendEmail(email, email_token);
            } catch (error) {
                console.error('Error sending email:', error);
                return { error: 'Failed to send email' };
            }
        }

        return {
            status: 201,
            success: true,
            message: 'Conta criada com sucesso 🎉',
            action: 'verificar_email 📩'
        }

    } catch (err) {
        console.error('Signup error:', err);
        return { error: 'Internal server error' };
    }
};