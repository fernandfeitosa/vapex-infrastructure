const walletController = require('../controllers/wallets.controller');

module.exports = (app) => {
    
    app.get('/wallet', walletController.getById);
}