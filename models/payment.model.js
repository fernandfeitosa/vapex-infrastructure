const sql = require('../config/db'); // Corrigido o caminho para o arquivo de configuração do banco

/**
 * Cria um novo registro de pagamento no banco de dados.
 * @param {object} paymentData - Dados do pagamento.
 * @param {string} paymentData.userId - ID do usuário.
 * @param {string} paymentData.mercadoPagoPaymentId - ID da preferência no Mercado Pago.
 * @param {number} paymentData.amount - Valor do pagamento.
 * @param {string} paymentData.status - Status inicial do pagamento.
 * @returns {Promise<object>} O registro do pagamento criado.
 */
async function create(paymentData) {
    const { userId, mercadoPagoPaymentId, amount, status } = paymentData;
    const [payment] = await sql`
        INSERT INTO payments (user_id, mercado_pago_payment_id, amount, status, created_at, updated_at)
        VALUES (${userId}, ${mercadoPagoPaymentId}, ${amount}, ${status}, ${new Date()}, ${new Date()})
        RETURNING *
    `;
    return payment;
}

/**
 * Encontra e atualiza um pagamento pelo ID de pagamento do Mercado Pago.
 * @param {string} paymentId - ID do pagamento real do Mercado Pago (não o ID da preferência).
 * @param {string} status - Novo status para o pagamento.
 * @returns {Promise<object>} O registro do pagamento atualizado.
 */
async function findByPaymentIdAndUpdate(paymentId, status) {
    // O webhook do Mercado Pago envia o ID do pagamento, não o ID da preferência.
    // O ideal é que a tabela 'payments' tenha uma coluna para o ID do pagamento real
    // e outra para o ID da preferência. Por enquanto, vamos assumir que o ID da preferência
    // é o que está salvo e que precisamos encontrar o pagamento por ele.
    // Esta lógica pode precisar de ajuste dependendo de como você armazena os IDs.
    const [payment] = await sql`
        UPDATE payments
        SET status = ${status}, updated_at = ${new Date()}
        WHERE mercado_pago_payment_id = ${paymentId}
        RETURNING *
    `;
    return payment;
}

module.exports = {
    create,
    findByPaymentIdAndUpdate,
};