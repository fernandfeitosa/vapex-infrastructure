const paymentController = require('../controllers/payment.controller');


module.exports = function paymentRoutes(app) {
    /**
     * @route   POST /api/payments/create-preference
     * @desc    Cria uma preferência de pagamento no Mercado Pago
     * @access  Private
     */
    app.post('/api/payments/create-preference', paymentController.createPreference);

    /**
     * @route   POST /api/payments/webhook
     * @desc    Recebe notificações de webhook do Mercado Pago
     * @access  Public
     */
    app.post('/api/payments/webhook', paymentController.receiveWebhook);
};