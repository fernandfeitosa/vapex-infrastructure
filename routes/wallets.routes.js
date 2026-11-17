const walletController = require('../controllers/wallets.controller');

module.exports = function walletRoutes(app) {
    app.get('/api/wallets', walletController.getById);
    app.post('/api/wallets', walletController.create);
    app.put('/api/wallets/:id', walletController.update);
    app.post('/api/wallets/deposit', walletController.deposit);
}