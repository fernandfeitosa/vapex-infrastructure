const { MercadoPagoConfig, Payment } = require('mercadopago');
const walletModel = require('../models/wallets.model');
const paymentModel = require('../models/payment.model');
const userModel = require('../models/user.model');
const { getIO } = require('../sockets/socket');

const dotenv = require('dotenv');
const path = require('path');
const envResult = dotenv.config({ path: path.join(__dirname, '..', '.env') });
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || envResult.parsed?.MERCADOPAGO_ACCESS_TOKEN;
const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || envResult.parsed?.MERCADOPAGO_PUBLIC_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

console.log('Mercado Pago token configured:', Boolean(accessToken), 'length:', accessToken?.length);
console.log('Mercado Pago public key configured:', Boolean(publicKey), 'length:', publicKey?.length);

let mercadoPagoConfig = null;
let paymentClient = null;

if (!accessToken) {
    console.warn('MERCADOPAGO_ACCESS_TOKEN não configurado.');
} else {
    if (accessToken.startsWith('APP_USR-')) {
        console.warn('Token Mercado Pago live detectado. Se estiver em desenvolvimento, prefira um token de teste/sandbox.');
    }

    mercadoPagoConfig = new MercadoPagoConfig({ accessToken });
    paymentClient = new Payment(mercadoPagoConfig);
    console.log('AccessToken usado para Mercado Pago:', accessToken);
}

/**
 * Cria uma preferência de pagamento no Mercado Pago.
 * @param {string} userId - O ID do usuário que está pagando.
 * @param {object} item - O item a ser pago.
 * @param {string} item.title - Título do item.
 * @param {number} item.quantity - Quantidade.
 * @param {number} item.unit_price - Preço unitário.
 * @returns {Promise<object>} Um objeto com os dados do PIX para pagamento.
 */
async function createPreference(userId, item) {
    try {
        const user = await userModel.getById(userId);
        if (!user || !user.email) {
            throw new Error('Usuário ou e-mail do usuário não encontrado para o pagamento.');
        }

        const payment = {
            transaction_amount: parseFloat(item.unit_price),
            description: item.title,
            payment_method_id: 'pix',
            payer: {
                email: user.email,
            },
            external_reference: String(userId),
        };

        if (!paymentClient) {
            throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
        }

        console.log('Criando pagamento PIX no Mercado Pago com payload:', JSON.stringify(payment));

        const response = await paymentClient.create({ body: payment });
        const paymentBody = response?.body || response;
        const paymentId = paymentBody?.id;

        console.log('Resposta do pagamento do Mercado Pago:', JSON.stringify(paymentBody));

        if (!paymentId) {
            throw new Error('Não foi possível obter o ID do pagamento no retorno do Mercado Pago.');
        }

        try {
            await paymentModel.create({
                userId,
                mercadoPagoPaymentId: paymentId,
                amount: item.unit_price,
                status: 'pending',
            });
        } catch (dbError) {
            // Ignora falha local de persistência para não bloquear a criação do pagamento PIX.
        }

        const pixData = paymentBody?.point_of_interaction?.transaction_data;

        return {
            qrCode: pixData?.qr_code || '',
            qrCodeBase64: pixData?.qr_code_base64 || '',
        };
    } catch (error) {
        console.error('Erro ao criar pagamento PIX no Mercado Pago:', error);
        throw new Error('Falha ao criar pagamento PIX.');
    }
}

/**
 * Lida com as notificações de webhook do Mercado Pago.
 * @param {string} paymentId - O ID do pagamento recebido do webhook.
 */
async function handleWebhook(paymentId) {
    try {
        console.log(`Recebido webhook para o pagamento ID: ${paymentId}`);
        if (!paymentClient) {
            return;
        }

        console.log(`Buscando pagamento ${paymentId} no Mercado Pago...`);
        const paymentInfo = await paymentClient.get({ id: paymentId });

        console.log('Resposta do webhook do Mercado Pago:', JSON.stringify(paymentInfo?.body || paymentInfo));

        if (!paymentInfo || !paymentInfo.body) {
            console.warn(`Pagamento ${paymentId} não encontrado no Mercado Pago.`);
            return;
        }

        const { status, external_reference: userId, transaction_amount: amount } = paymentInfo.body;

        console.log(`Status do pagamento ${paymentId}: ${status}`);

        if (status === 'approved') {
            const wallet = await walletModel.getWalletById(userId);
            if (wallet) {
                const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
                await walletModel.updateWallet(wallet.id, { balance: newBalance });

                const io = getIO();
                if (io) {
                    io.to(String(userId)).emit('wallet:update', {
                        userId,
                        balance: newBalance,
                        message: `Recarga de R$${amount.toFixed(2)} concluída com sucesso!`
                    });
                }
            }
        }

        // O webhook do Mercado Pago pode ser sobre a preferência ou sobre o pagamento em si.
        // O `paymentId` aqui é o ID do pagamento real.
        // No entanto, salvamos o `preference_id` no banco.
        // Para uma correspondência robusta, o ideal seria salvar o `preference_id` na criação
        // e depois, no webhook, usar o `external_reference` para encontrar o usuário e a transação pendente.
        // Por simplicidade aqui, vamos assumir que o `paymentId` do webhook corresponde ao que salvamos.
        const localPayment = await paymentModel.findByPaymentIdAndUpdate(paymentId, status);

        if (status === 'approved' && localPayment && localPayment.status !== 'approved') {
            console.log(`Aprovado! Creditando R$${amount} para o usuário ${userId}.`);
        }
    } catch (error) {
        console.error(`Erro ao processar webhook para o pagamento ${paymentId}:`, error);
        // É importante não lançar um erro aqui para que o Mercado Pago não tente reenviar o webhook indefinidamente
    }
}

module.exports = {
    createPreference,
    handleWebhook,
};