
const jwt = require('jsonwebtoken');
const authController = require('../controllers/auth.controller');

/*
    Auth Routes
    - POST /auth/login: Login user
    - POST /auth/register: Register user
    - GET /auth/valide/:email/:token: Valide email
*/

module.exports = function authRoutes(app) {

    // signIn route
    app.post('/api/auth/signin', authController.signIn);

    // signUp route
    app.post('/api/auth/signup', authController.signUp);

    // Google auth route
    app.post('/api/auth/google', authController.googleAuth);

    //route valide token email
    app.get('/api/auth/verify/:email/:token', authController.verifyEmailToken);

}