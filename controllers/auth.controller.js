const signIn = require('../services/auth/signin.service');
const signUp = require('../services/auth/signup.service');
const verifyEmailToken = require('../services/auth/valida_email.service');
const googleAuthService = require('../services/auth/google.service');
const crypto = require('crypto');


module.exports = { 

    googleAuth: async (req, res) => {
        console.log('Auth controller googleAuth called');
        console.log('Auth google request body:', JSON.stringify(req.body));

        if (!req.body) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const { email, username, googleAuthCode, googleRedirectUri, avatarUrl } = req.body;
        try {
            const result = await googleAuthService.googleAuth({ email, username, googleAuthCode, googleRedirectUri, avatarUrl });
            console.log('Auth controller googleAuth result:', result);
            return res.status(result.status || 500).json(result);
        } catch (err) {
            console.error('Google auth controller error:', err);
            return res.status(500).json({
                status: 500,
                success: false,
                message: err.message || 'Erro interno ao autenticar com Google'
            });
        }
    },

    signIn: async (req, res) => {

        if(!req.body) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const { email, password, googleAuthCode } = req.body;

        const result = await signIn(email, password, googleAuthCode);

        res.status(result.status || 500).json(result);
    },
    signUp: async (req, res) => {

        if(!req.body) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const { username, email, password, googleAuthCode } = req.body;
        const avatarUrl = `https://api.dicebear.com/10.x/fun-emoji/png?seed=${username}`;

        const result = await signUp(
            username,
            email,
            password,
            avatarUrl,
            googleAuthCode
        );

        res.status(result.status || 500).json(result);
    },
    verifyEmailToken: async (req, res) => {
        const { email, token } = req.params;

        const result = await verifyEmailToken(email, token);
        
        res.json(result);
    },
 };