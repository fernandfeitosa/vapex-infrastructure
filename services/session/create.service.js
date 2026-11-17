const sessionModel = require("../../models/session.model");
const redisClient = require("../../redis/client");
const hostModel = require("../../models/host.model");
const walletModel = require("../../models/wallets.model");
const { getIO } = require("../../sockets/socket");

const CHARGE_PER_MINUTE = 0.10;

/**
 * Tenta reservar um host disponível da lista.
 * @param {Array} hosts - Lista de hosts disponíveis.
 * @param {string} userId - ID do usuário tentando reservar.
 * @returns {object|null} - O host reservado ou nulo se nenhum pôde ser reservado.
 */
async function reserveAvailableHost(hosts, userId) {
    for (const host of hosts) {
        const lockKey = `lock:host:${host.id}`;
        const lockAcquired = await redisClient.set(lockKey, userId, { NX: true, EX: 5 });

        if (lockAcquired) {
            try {
                // Re-check host status from DB inside the lock to be sure
                const currentHostState = await hostModel.getHostById(host.id);
                if (currentHostState.status !== 'available') {
                    console.log(`[queue] reserve failed for user ${userId}, host ${host.id} was already taken.`);
                    await redisClient.del(lockKey);
                    continue; // Try next host
                }

                console.log(`[queue] reserve host=${host.id} user=${userId}`);
                await hostModel.updateHost(host.id, { status: "in_use" });
                await redisClient.del(lockKey);
                return host;
            } catch (err) {
                await redisClient.del(lockKey);
                console.error(`Erro ao tentar reservar o host ${host.id}. Tentando o próximo.`, err);
            }
        } else {
            console.log(`[queue] reserve failed for user ${userId}, could not acquire lock for host ${host.id}.`);
        }
    }
    return null;
}

async function createSessionForUser(userId, gameId, wallet, reservedHost) {
    // 1. Debita o valor inicial
    const newBalance = Number(wallet.balance) - CHARGE_PER_MINUTE;
    await walletModel.updateWallet(wallet.id, { balance: newBalance });

    const session = await sessionModel.create({
        host_id: reservedHost.id,
        user_id: userId,
        game_id: gameId,
        duration_minutes: 10,
        status: "ACTIVE"
    });

    const key = `session:${session.id}`;
    const sessionPayload = {
        id: session.id,
        userId,
        hostId: reservedHost.id,
        walletId: wallet.id,
        status: "ACTIVE",
        balance: newBalance, // 2. Usa o novo saldo
        startedAt: Date.now(),
        lastHeartbeat: Date.now(),
        lastChargeAt: Date.now(),
        lastDbUpdateAt: Date.now()
    };

    await redisClient.set(key, JSON.stringify(sessionPayload));
    await redisClient.set(`user:${userId}:current_session`, session.id);
    await redisClient.sAdd("sessions:active", key);

    getIO()
        .to(String(userId))
        .emit("session:created", {
            sessionId: session.id,
            balance: newBalance, // 3. Envia o novo saldo para o cliente
            status: "ACTIVE",
            message: "Sessão criada com sucesso!",
            host: {
                id: reservedHost.id,
                ip: reservedHost.ip_address,
                hostname: reservedHost.hostname,
                port: 47984
            }
        });

    return {
        success: true,
        data: {
            session_id: session.id,
            host: {
                id: reservedHost.id,
                ip: reservedHost.ip_address,
                hostname: reservedHost.hostname,
                port: 47984,
                status: "ready_to_connect 🚀"
            },
            client: {
                user_id: userId,
                game_id: gameId
            },
            connection: {
                pairing_required: true,
                protocol: "sunshine/moonlight",
                state: "waiting_pairing 🔐"
            }
        }
    };
}

async function create(sessionData) {
    try {
        const user_id = sessionData?.user?.id;
        const game_id = sessionData?.body?.game_id;

        if (!user_id || !game_id) {
            return { status: 400, success: false, message: "Dados inválidos", data: null };
        }

        const activeSessionId = await redisClient.get(`user:${user_id}:current_session`);
        if (activeSessionId) {
            const session = await sessionModel.findActiveByUser(user_id);

            if (session) {
                const reservedHost = await hostModel.getHostById(session.host_id);

                return {
                    status: 200,
                    success: true,
                    message: "Sua sessão foi recuperada. Divirta-se!",
                    data: {
                        session_id: session.id,
                        host: {
                            id: reservedHost.id,
                            ip: reservedHost.ip_address,
                            hostname: reservedHost.hostname,
                            port: 47984,
                            status: "ready_to_connect 🚀"
                        },
                        client: {
                            user_id: session.user_id,
                            game_id: session.game_id
                        },
                        connection: {
                            pairing_required: true,
                            protocol: "sunshine/moonlight",
                            state: "waiting_pairing 🔐"
                        }
                    }
                };
            }
        }

        const wallet = await walletModel.getWalletById(user_id);
        if (!wallet) {
            return { status: 404, success: false, message: "Carteira não encontrada", data: null };
        }

        if (Number(wallet.balance) < CHARGE_PER_MINUTE) {
            return { status: 400, success: false, message: "Recarregue sua conta para continuar", data: null };
        }

        const hosts = await hostModel.getAllAvailableHosts();
        if (!hosts || hosts.length === 0) {
            const queueService = require("./queue.service");
            let queueStatus = await queueService.enqueueUser(user_id, game_id);

            if (!queueStatus) {
                // To handle the race condition where enqueueUser is already in progress,
                // we fetch the current status to return a meaningful response.
                queueStatus = await queueService.getQueueStatus(user_id);
            }

            let message = "Todos os hosts estão ocupados. Você foi colocado na fila. Sua posição será atualizada em tempo real.";
            if (queueStatus && queueStatus.position) {
                message = `Todos os hosts estão ocupados. Você está na posição ${queueStatus.position} da fila. Sua posição será atualizada em tempo real.`;
            }

            return {
                status: 202,
                success: true,
                message: message,
                data: {
                    status: "queued",
                    queue: queueStatus || { queued: true, position: null, total: null, estimatedWaitSeconds: null }
                }
            };
        }

        const reservedHost = await reserveAvailableHost(hosts, user_id);
        if (!reservedHost) {
            console.log(`Todos os hosts foram ocupados durante a tentativa de reserva para o usuário ${user_id}.`);
            const queueService = require("./queue.service");
            let queueStatus = await queueService.enqueueUser(user_id, game_id);

            if (!queueStatus) {
                // To handle the race condition where enqueueUser is already in progress,
                // we fetch the current status to return a meaningful response.
                queueStatus = await queueService.getQueueStatus(user_id);
            }

            let message = "Todos os hosts estão ocupados. Você foi colocado na fila. Sua posição será atualizada em tempo real.";
            if (queueStatus && queueStatus.position) {
                message = `Todos os hosts estão ocupados. Você está na posição ${queueStatus.position} da fila. Sua posição será atualizada em tempo real.`;
            }

            return {
                status: 202,
                success: true,
                message: message,
                data: {
                    status: "queued",
                    queue: queueStatus || { queued: true, position: null, total: null, estimatedWaitSeconds: null }
                }
            };
        }

        const queueService = require("./queue.service");
        await queueService.removeQueuedUser(user_id);
        const createdSession = await createSessionForUser(user_id, game_id, wallet, reservedHost);

        return {
            status: 201,
            success: true,
            message: "Sessão criada com sucesso!",
            data: createdSession.data
        };
    } catch (err) {
        console.error("Falha crítica ao criar sessão:", err);
        return {
            status: 500,
            success: false,
            message: "Falha ao criar sessão",
            data: null
        };
    }
}

module.exports = create;
module.exports.reserveAvailableHost = reserveAvailableHost;
module.exports.createSessionForUser = createSessionForUser;