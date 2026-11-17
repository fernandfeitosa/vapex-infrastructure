
const sessionModel = require("../../models/session.model");
const redisClient = require("../../redis/client");
const hostModel = require("../../models/host.model");
const walletModel = require("../../models/wallets.model");
const { getIO } = require("../../sockets/socket");
const queueService = require("./queue.service");

module.exports = async (sessionId, isGraceful = true) => {
    try {
        const sessionKey = `session:${sessionId}`;
        const rawSession = await redisClient.get(sessionKey);

        if (!rawSession) {
            console.log(`Sessão ${sessionId} não encontrada no Redis para encerramento.`);
            return;
        }

        const session = JSON.parse(rawSession);
        const { userId, hostId } = session;

        // 1. Limpa dados da sessão no Redis
        await redisClient.del(sessionKey);
        await redisClient.del(`user:${userId}:current_session`);
        await redisClient.sRem('sessions:active', sessionKey);

        // 2. Atualiza o status do host para 'available'
        if (hostId) {
            await hostModel.updateHost(hostId, { status: 'available' });
            console.log(`Host ${hostId} liberado.`);

            if (isGraceful) {
                console.log(`🔌 Sessão ${sessionId} para usuário ${userId} encerrada.`);
            } else {
                console.log(`🔌 Sessão ${sessionId} para usuário ${userId} encerrada por inatividade.`);
            }
            
            await queueService.processQueue();
        }

        // 3. Atualiza a sessão no banco de dados
        await sessionModel.update(sessionId, {
            status: 'ENDED',
            endedAt: new Date()
        });

    } catch (error) {
        console.error(`Erro ao encerrar a sessão ${sessionId}:`, error);
    }
};