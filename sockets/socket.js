// socket/index.js

const { Server } = require("socket.io");
const closeSession = require("../services/session/close.service");
const jwt = require("jsonwebtoken");
const redisClient = require("../redis/client");
const walletsModel = require("../models/wallets.model");
const sessionModel = require("../models/session.model");
const hostModel = require("../models/host.model");
const queueService = require("../services/session/queue.service");

let io;

// CONTROLA SOCKET ATIVO POR USUÁRIO
const connectedUsers = new Map();
// Stores timeouts for users who have disconnected, to allow a grace period for reconnection
const pendingTerminationTimeouts = new Map();

function initialize(server) {

    io = new Server(server, {
        cors: {
            origin: "*"
        }
    });

    // =========================
    // AUTH MIDDLEWARE
    // =========================

    io.use(async (socket, next) => {

        try {

            const token =
                socket.handshake.auth.token;

            if (!token) {

                return next(
                    new Error("Token não enviado")
                );
            }

            // VERIFICA JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            // USER ID
            const userId =
                String(decoded.id);

            // =========================
            // VERIFICA TOKEN ATIVO
            // =========================

            const savedToken =
                await redisClient.get(
                    `user:${userId}:socket_token`
                );

            // PRIMEIRO LOGIN
            if (!savedToken) {

                await redisClient.set(
                    `user:${userId}:socket_token`,
                    token
                );

            } else {

                // TOKEN DIFERENTE
                if (savedToken !== token) {

                    // INVALIDA LOGIN ANTIGO
                    await redisClient.set(
                        `user:${userId}:socket_token`,
                        token
                    );
                }
            }

            // SALVA USER NO SOCKET
            socket.user = decoded;
            socket.token = token;

            next();

        } catch (err) {

            console.error(err);

            return next(
                new Error("Token inválido")
            );
        }
    });

    // =========================
    // CONNECTION
    // =========================

    io.on("connection", async (socket) => {

        const userId =
            String(socket.user.id);

        // Clear any pending termination timeout if the user reconnects
        if (pendingTerminationTimeouts.has(userId)) {
            clearTimeout(pendingTerminationTimeouts.get(userId));
            pendingTerminationTimeouts.delete(userId);
            console.log(`🔄 Usuário ${userId} reconectou, cancelando encerramento pendente.`);
        }

        const token =
            socket.token;

        // =========================
        // DESCONECTA SOCKET ANTIGO
        // =========================

        const oldSocket =
            connectedUsers.get(userId);

        if (oldSocket) {

            console.log(
                `⚠️ Sessão antiga desconectada: ${userId}`
            );

            oldSocket.emit(
                "session:kicked",
                {
                    message:
                        "Sua conta foi conectada em outro dispositivo ⚠️"
                }
            );

            oldSocket.disconnect(true);
        }

        // SALVA SOCKET ATUAL
        connectedUsers.set(
            userId,
            socket
        );

        // ENTRA NA ROOM
        socket.join(userId);

        const queueStatus = await queueService.getQueueStatus(userId);
        if (queueStatus.queued) {
            socket.emit("queue:position", {
                ...queueStatus,
                message: "Você está na fila. Aguarde a próxima vaga disponível."
            });
        }

        console.log(
            `✅ Usuário conectado: ${userId}`
        );

        // =========================
        // HEARTBEAT
        // =========================

        socket.on(
            "session:heartbeat",
            async () => {

                try {

                    // VERIFICA SE TOKEN AINDA É O ATIVO
                    const activeToken =
                        await redisClient.get(
                            `user:${userId}:socket_token`
                        );

                    // TOKEN ANTIGO / ROUBADO
                    if (activeToken !== token) {

                        socket.emit(
                            "session:expired",
                            {
                                message:
                                    "Sessão expirada ⚠️"
                            }
                        );

                        return socket.disconnect(true);
                    }

                    // Otimização: Em vez de iterar sobre todos, use uma chave direta
                    // ou salve o sessionID no objeto socket ao iniciar a sessão.
                    const sessionId = await redisClient.get(`user:${userId}:current_session`);
                    
                    if (sessionId) {
                        console.log(`[session] heartbeat user=${userId} session=${sessionId}`);
                        const sessionKey = `session:${sessionId}`;
                        const lockKey = `lock:${sessionKey}`;

                        // Só atualiza se o billing worker não estiver processando a cobrança (evita race condition no saldo)
                        const isLocked = await redisClient.get(lockKey);
                        if (!isLocked) {
                            const sessionData = await redisClient.get(sessionKey);
                            if (sessionData) {
                                let session = JSON.parse(sessionData);
                                session.lastHeartbeat = Date.now();
                                
                                if (session.terminateImmediatelyAt) {
                                    delete session.terminateImmediatelyAt;
                                }
                                
                                await redisClient.set(sessionKey, JSON.stringify(session));

                                const now = Date.now();
                                const lastDbUpdate = session.lastDbUpdateAt || 0;
                                const DB_UPDATE_INTERVAL_MS = 60 * 1000; // 60 segundos

                                if (now - lastDbUpdate > DB_UPDATE_INTERVAL_MS) {
                                    const durationMinutes = Math.floor((now - session.startedAt) / 60000);
                                    
                                    await sessionModel.update(sessionId, { duration_minutes: durationMinutes });

                                    session.lastDbUpdateAt = now;
                                    await redisClient.set(sessionKey, JSON.stringify(session));
                                }
                            }
                        }
                    }

                } catch (err) {

                    console.error(
                        "❌ Heartbeat error:",
                        err
                    );
                }
            }
        );

        socket.on("queue:leave", async () => {
            try {
                const result = await queueService.leaveQueue(userId);
                socket.emit("queue:left", result);
            } catch (error) {
                console.error(`❌ Erro ao remover usuário ${userId} da fila:`, error);
            }
        });

        socket.on("queue:heartbeat", async () => {
            try {
                console.log(`[socket] queue heartbeat received user=${userId}`);
                const result = await queueService.heartbeatQueue(userId);
                socket.emit("queue:heartbeat:ack", result);
            } catch (error) {
                console.error(`❌ Erro ao processar heartbeat da fila para ${userId}:`, error);
            }
        });

        // =========================
        // ENCERRAMENTO VIA CLIENTE
        // =========================
        socket.on("session:end", async () => {
            try {
                // Localiza a sessão ativa do usuário
                const sessionId = await redisClient.get(`user:${userId}:current_session`);
                
                if (sessionId) {
                    // Delega o encerramento da sessão para o serviço especializado
                    await closeSession(sessionId, true);

                    console.log(`🔌 Usuário ${userId} encerrou a sessão ${sessionId} manualmente.`);

                    // Busca o saldo atualizado para notificar o frontend
                    const wallet = await walletsModel.getWalletById(userId);

                    // Notifica o frontend que o encerramento foi processado
                    io.to(userId).emit("session:ended", {
                        sessionId: sessionId,
                        balance: wallet ? wallet.balance : null,
                        message: "Sessão encerrada com sucesso."
                    });

                    io.to(userId).emit("wallet:update", {
                        userId: userId,
                        balance: wallet ? wallet.balance : null
                    });
                }
            } catch (err) {
                console.error("❌ Erro ao processar session:end:", err);
            }
        });

        // =========================
        // DISCONNECT
        // =========================

        socket.on(
            "disconnect",
            async (reason) => {

                console.log(
                    `❌ Usuário desconectado: ${userId}`,
                    reason
                );

                const currentSocket =
                    connectedUsers.get(userId);
                // REMOVE APENAS SE FOR O SOCKET ATUAL
                if (
                    currentSocket &&
                    currentSocket.id === socket.id
                ) {
                    connectedUsers.delete(userId);

                    const sessionId = await redisClient.get(`user:${userId}:current_session`);

                    if (!connectedUsers.has(userId)) {
                        await queueService.leaveQueue(userId);
                    }

                    if (sessionId) {
                        const GRACE_PERIOD_MS = 15 * 1000; // 15 seconds grace period
                        const disconnectedAt = Date.now();

                        const terminationTimeout = setTimeout(async () => {
                            // Check if the user is still disconnected after the grace period
                            if (!connectedUsers.has(userId)) {
                                console.log(`⏳ Usuário ${userId} permaneceu desconectado. Encerrando sessão ${sessionId} diretamente.`);
                                try {
                                    await closeSession(sessionId, false); // Chama o serviço de encerramento diretamente
                                } catch (error) {
                                    console.error(`❌ Erro ao marcar sessão ${sessionId} para encerramento imediato:`, error);
                                }
                            } else {
                                console.log(`✅ Usuário ${userId} reconectou durante o período de carência. Encerramento cancelado.`);
                            }
                            pendingTerminationTimeouts.delete(userId); // Clean up timeout map
                        }, GRACE_PERIOD_MS);

                        pendingTerminationTimeouts.set(userId, terminationTimeout);
                    }
                }
            }
        );

    });

    return io;
}

module.exports = {
    initialize,
    getIO: () => io
};
