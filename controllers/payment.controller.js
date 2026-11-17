const paymentService = require('../services/payment.service');

/**
 * Controller para criar uma preferência de pagamento.
 */
async function createPreference(req, res) {
    try {
        const userId = req.user.id; // Supondo que você tenha o ID do usuário autenticado
        const { title, unit_price } = req.body;

        if (!title || !unit_price || isNaN(parseFloat(unit_price))) {
            return res.status(400).json({ message: 'Dados do item inválidos.' });
        }

        const item = {
            title,
            quantity: 1,
            unit_price: parseFloat(unit_price),
            currency_id: 'BRL'
        };

        const paymentData = await paymentService.createPreference(userId, item);

        return res.status(201).json(paymentData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro interno ao criar preferência.' });
    }
}

/**
 * Controller para receber webhooks do Mercado Pago.
 */
async function receiveWebhook(req, res) {
    const { query } = req;

    // O Mercado Pago envia o ID do pagamento no parâmetro 'data.id' para webhooks de pagamentos
    if (query.type === 'payment' && query['data.id']) {
        const paymentId = query['data.id'];
        await paymentService.handleWebhook(paymentId);
    }

    // Responda com status 200 para confirmar o recebimento da notificação
    res.sendStatus(200);
}

module.exports = {
    createPreference,
    receiveWebhook,
};