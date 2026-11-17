const redisClient = require("../../redis/client");
const hostModel = require("../../models/host.model");
const walletModel = require("../../models/wallets.model");

const QUEUE_LIST_KEY = "queue:session:list";
const QUEUE_ENTRY_PREFIX = "queue:session:user:";
const MIN_REQUIRED = 0.01;
const QUEUE_HEARTBEAT_TIMEOUT_MS = 45 * 1000;

function getSocketIO() {
    try {
        return require("../../sockets/socket").getIO();
    } catch (error) {
        return null;
    }
}

function normalizeUserId(userId) {
    return String(userId);
}

function getQueueEntryKey(userId) {
    return `${QUEUE_ENTRY_PREFIX}${normalizeUserId(userId)}`;
}

function buildQueueSnapshot(entries) {
    return entries.map((entry, index) => ({
        ...entry,
        position: index + 1,
        estimatedWaitSeconds: Math.max(30, (index + 1) * 30)
    }));
}

function buildQueueStatus(snapshot, userId) {
    const normalizedUserId = normalizeUserId(userId);
    const index = snapshot.findIndex((entry) => normalizeUserId(entry.userId) === normalizedUserId);

    if (index === -1) {
        return {
            queued: false,
            position: 0,
            total: snapshot.length,
            estimatedWaitSeconds: 0
        };
    }

    const queuedEntry = snapshot[index];
    return {
        queued: true,
        position: queuedEntry.position,
        total: snapshot.length,
        estimatedWaitSeconds: queuedEntry.estimatedWaitSeconds
    };
}

async function normalizeQueueList() {
    const queuedIds = await redisClient.lRange(QUEUE_LIST_KEY, 0, -1);
    const uniqueIds = [];
    const seen = new Set();
    for (const userId of queuedIds) {
        if (!seen.has(userId)) {
            seen.add(userId);
            uniqueIds.push(userId);
        }
    }
    return uniqueIds;
}

async function getQueueSnapshot() {
    const queuedIds = await normalizeQueueList();
    const entries = [];

    for (const userId of queuedIds) {
        const entryKey = getQueueEntryKey(userId);
        const rawEntry = await redisClient.get(entryKey);

        if (!rawEntry) {
            continue;
        }

        try {
            const parsedEntry = JSON.parse(rawEntry);
            entries.push(parsedEntry);
        } catch (error) {
            console.error(`Erro ao ler entrada de fila para ${userId}:`, error);
        }
    }

    return buildQueueSnapshot(entries);
}

async function getQueuePosition(userId) {
    const snapshot = await getQueueSnapshot();
    const item = snapshot.find((entry) => normalizeUserId(entry.userId) === normalizeUserId(userId));
    return item ? item.position : 0;
}

async function getQueueSize() {
    return redisClient.llen(QUEUE_LIST_KEY);
}

async function getQueueStatus(userId) {
    const snapshot = await getQueueSnapshot();
    return buildQueueStatus(snapshot, userId);
}

async function removeQueuedUser(userId) {
    const normalizedUserId = normalizeUserId(userId);
    await redisClient.lRem(QUEUE_LIST_KEY, 0, normalizedUserId);
    await redisClient.del(getQueueEntryKey(normalizedUserId));
}

async function requeueUser(entry) {
    const normalizedUserId = normalizeUserId(entry?.userId);
    if (!normalizedUserId) {
        return;
    }

    // Check if the user already has an active session.
    const activeSessionId = await redisClient.get(`user:${normalizedUserId}:current_session`);
    if (activeSessionId) {
        console.log(`[queue] user ${normalizedUserId} already has an active session ${activeSessionId}. Not re-queuing.`);
        return;
    }

    const existingQueue = await redisClient.lRange(QUEUE_LIST_KEY, 0, -1);
    if (existingQueue.includes(normalizedUserId)) {
        return;
    }

    const payload = {
        ...entry,
        lastHeartbeatAt: Date.now(),
        requeuedAt: Date.now()
    };

    await redisClient.set(getQueueEntryKey(normalizedUserId), JSON.stringify(payload));
    await redisClient.rPush(QUEUE_LIST_KEY, normalizedUserId);
}

async function emitQueuePayload(userId, payload) {
    const io = getSocketIO();
    if (!io) {
        return;
    }

    io.to(normalizeUserId(userId)).emit("queue:position", payload);
    io.to(normalizeUserId(userId)).emit("queue:state", payload);
}

async function broadcastQueueUpdates() {
    const snapshot = await getQueueSnapshot();
    const queueState = snapshot.map((entry) => ({
        userId: entry.userId,
        position: entry.position,
        estimatedWaitSeconds: entry.estimatedWaitSeconds
    }));

    const io = getSocketIO();
    if (!io) {
        return queueState;
    }

    for (const entry of snapshot) {
        const userId = normalizeUserId(entry.userId);
        const status = buildQueueStatus(snapshot, userId);
        const payload = {
            queued: true,
            position: status.position,
            total: status.total,
            estimatedWaitSeconds: status.estimatedWaitSeconds,
            queue: queueState,
            message: "Sua posição na fila foi atualizada."
        };

        io.to(userId).emit("queue:position", payload);
        io.to(userId).emit("queue:state", {
            queued: true,
            total: status.total,
            queue: queueState,
            message: "Estado da fila atualizado."
        });
    }

    return queueState;
}

async function enqueueUser(userId, gameId) {
    const normalizedUserId = normalizeUserId(userId);
    const userLockKey = `lock:enqueue:${normalizedUserId}`;
    const lockAcquired = await redisClient.set(userLockKey, "1", { NX: true, EX: 5 });

    if (!lockAcquired) {
        console.log(`[queue] enqueue for user ${normalizedUserId} already in progress.`);
        return; // Another enqueue operation is already running for this user.
    }

    try {
        // Check if the user already has an active session.
        const activeSessionId = await redisClient.get(`user:${normalizedUserId}:current_session`);
        if (activeSessionId) {
            console.log(`[queue] user ${normalizedUserId} already has an active session ${activeSessionId}. Not enqueuing.`);
            return;
        }

        const existingQueue = await redisClient.lRange(QUEUE_LIST_KEY, 0, -1);

        if (existingQueue.includes(normalizedUserId)) {
            await removeQueuedUser(normalizedUserId);
        }

        const payload = {
            userId: normalizedUserId,
            gameId,
            enqueuedAt: Date.now(),
            lastHeartbeatAt: Date.now()
        };

        await redisClient.set(getQueueEntryKey(normalizedUserId), JSON.stringify(payload));
        await redisClient.rPush(QUEUE_LIST_KEY, normalizedUserId);

        const snapshot = await getQueueSnapshot();
        console.log(`[queue] enqueue user=${normalizedUserId} gameId=${gameId} size=${snapshot.length} users=${snapshot.map((entry) => entry.userId).join(",")}`);
        const status = await getQueueStatus(normalizedUserId);
        const queueState = await broadcastQueueUpdates();

        const io = getSocketIO();
        if (io) {
            io.to(normalizedUserId).emit("queue:joined", {
                ...status,
                queue: queueState,
                message: "Você entrou na fila. Aguarde a próxima vaga disponível."
            });
        }

        const availableHosts = await hostModel.getAllAvailableHosts();
        if (availableHosts && availableHosts.length > 0) {
            await processQueue();
        }

        return status;
    } finally {
        await redisClient.del(userLockKey);
    }
}

async function leaveQueue(userId) {
    const normalizedUserId = normalizeUserId(userId);
    const snapshot = await getQueueSnapshot();
    const wasQueued = snapshot.some((entry) => normalizeUserId(entry.userId) === normalizedUserId);

    if (!wasQueued) {
        return { queued: false, position: 0, total: 0, message: "Você não estava na fila." };
    }

    await removeQueuedUser(normalizedUserId);
    const remainingSnapshot = await getQueueSnapshot();
    console.log(`[queue] leave user=${normalizedUserId} size=${remainingSnapshot.length} users=${remainingSnapshot.map((entry) => entry.userId).join(",")}`);
    await broadcastQueueUpdates();

    const io = getSocketIO();
    if (io) {
        io.to(normalizedUserId).emit("queue:left", {
            queued: false,
            position: 0,
            total: 0,
            message: "Você saiu da fila."
        });
    }

    return { queued: false, position: 0, total: 0, message: "Você saiu da fila." };
}

async function heartbeatQueue(userId) {
    const normalizedUserId = normalizeUserId(userId);
    const queueSnapshot = await getQueueSnapshot();
    const currentEntry = queueSnapshot.find((entry) => normalizeUserId(entry.userId) === normalizedUserId);

    if (!currentEntry) {
        // User is not in the queue. Check if they have an active session.
        const sessionId = await redisClient.get(`user:${normalizedUserId}:current_session`);
        if (sessionId) {
            const sessionKey = `session:${sessionId}`;
            const sessionData = await redisClient.get(sessionKey);
            if (sessionData) {
                let session = JSON.parse(sessionData);
                session.lastHeartbeat = Date.now();
                await redisClient.set(sessionKey, JSON.stringify(session));
                // This is a workaround for a client-side bug.
                // The client is sending queue:heartbeat instead of session:heartbeat.
                return { queued: false, message: "Heartbeat da sessão recebido." };
            }
        }
        return { queued: false, message: "Você não está na fila." };
    }

    const payload = {
        ...currentEntry,
        lastHeartbeatAt: Date.now()
    };

    await redisClient.set(getQueueEntryKey(normalizedUserId), JSON.stringify(payload));
    const heartbeatSnapshot = await getQueueSnapshot();
    console.log(`[queue] heartbeat user=${normalizedUserId} size=${heartbeatSnapshot.length} users=${heartbeatSnapshot.map((entry) => entry.userId).join(",")}`);

    const availableHosts = await hostModel.getAllAvailableHosts();
    if (availableHosts && availableHosts.length > 0) {
        console.log(`[queue] heartbeat trigger process user=${normalizedUserId} availableHosts=${availableHosts.length}`);
        await processQueue();
    }

    return { queued: true, message: "Heartbeat recebido." };
}

async function expireInactiveQueueUsers() {
    const snapshot = await getQueueSnapshot();
    const now = Date.now();
    const inactiveUsers = snapshot.filter((entry) => {
        const lastHeartbeatAt = entry.lastHeartbeatAt || entry.enqueuedAt || 0;
        return now - lastHeartbeatAt > QUEUE_HEARTBEAT_TIMEOUT_MS;
    });

    for (const entry of inactiveUsers) {
        const remainingSnapshot = await getQueueSnapshot();
        console.log(`[queue] expire user=${entry.userId} reason=inactive size=${remainingSnapshot.length} users=${remainingSnapshot.map((item) => item.userId).join(",")}`);
        await removeQueuedUser(entry.userId);

        const io = getSocketIO();
        if (io) {
            io.to(normalizeUserId(entry.userId)).emit("queue:left", {
                queued: false,
                position: 0,
                total: 0,
                message: "Você foi removido da fila por inatividade."
            });
        }
    }

    await broadcastQueueUpdates();
}

async function clearQueue() {
    const queuedIds = await redisClient.lRange(QUEUE_LIST_KEY, 0, -1);

    for (const userId of queuedIds) {
        await redisClient.del(getQueueEntryKey(userId));
    }

    await redisClient.del(QUEUE_LIST_KEY);
    await broadcastQueueUpdates();
}

async function processQueue() {
    const createSessionService = require("./create.service");

    const availableHosts = await hostModel.getAllAvailableHosts();
    const queueSnapshot = await getQueueSnapshot();
    console.log(`[queue] process start availableHosts=${availableHosts?.length || 0} queued=${queueSnapshot.length} users=${queueSnapshot.map((entry) => entry.userId).join(",")}`);

    if (!availableHosts || availableHosts.length === 0) {
        await broadcastQueueUpdates();
        return [];
    }
    const assigned = [];

    for (const host of availableHosts) {
        if (queueSnapshot.length === 0) {
            break;
        }

        const queueEntry = queueSnapshot.shift();
        const userId = normalizeUserId(queueEntry.userId);

        try {
            const wallet = await walletModel.getWalletById(userId);
            if (!wallet || Number(wallet.balance) < MIN_REQUIRED) {
                const remainingSnapshot = await getQueueSnapshot();
                console.log(`[queue] process skip user=${userId} reason=insufficient_balance size=${remainingSnapshot.length} users=${remainingSnapshot.map((entry) => entry.userId).join(",")}`);
                await removeQueuedUser(userId);
                await emitQueuePayload(userId, {
                    queued: false,
                    position: 0,
                    total: 0,
                    estimatedWaitSeconds: 0,
                    queue: [],
                    message: "Saldo insuficiente para entrar em uma sessão."
                });
                continue;
            }

            const reservedHost = await createSessionService.reserveAvailableHost([host], userId);
            if (!reservedHost) {
                continue;
            }

            await removeQueuedUser(userId);
            const remainingSnapshot = await getQueueSnapshot();
            console.log(`[queue] process assign user=${userId} host=${reservedHost.id} size=${remainingSnapshot.length} users=${remainingSnapshot.map((entry) => entry.userId).join(",")}`);
            const result = await createSessionService.createSessionForUser(userId, queueEntry.gameId, wallet, reservedHost);

            if (result?.success) {
                assigned.push({
                    userId,
                    hostId: reservedHost.id,
                    sessionId: result?.data?.session_id
                });
            }
        } catch (error) {
            console.error(`Erro ao processar fila para o usuário ${userId}:`, error);
            await hostModel.updateHost(host.id, { status: "available" });
            await requeueUser(queueEntry);
        }
    }

    await broadcastQueueUpdates();
    return assigned;
}

module.exports = {
    enqueueUser,
    getQueuePosition,
    getQueueStatus,
    processQueue,
    broadcastQueueUpdates,
    removeQueuedUser,
    leaveQueue,
    heartbeatQueue,
    expireInactiveQueueUsers,
    clearQueue,
    buildQueueSnapshot,
    buildQueueStatus
};
