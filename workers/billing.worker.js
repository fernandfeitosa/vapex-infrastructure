const redis = require("../redis/client");
const walletsModel = require("../models/wallets.model");
const { getIO } = require("../sockets/socket");
const closeSession = require("../services/session/close.service");

module.exports = () => {
    const CHARGE_PER_MINUTE = 0.10;
    const HEARTBEAT_TIMEOUT = 20000; // Aumentado para 20s para mais tolerância
    const MINUTE_IN_MS = 60 * 1000;

    setInterval(async () => {

        try {

            const ids =
                await redis.sMembers(
                    "sessions:active"
                );

            const now = Date.now();

            for (const id of ids) {

                const lockKey = `lock:${id}`;

                const lock =
                    await redis.get(lockKey);

                if (lock) continue;

                await redis.set(
                    lockKey,
                    "1",
                    { EX: 2 }
                );

                try {

                    const raw =
                        await redis.get(id);

                    if (!raw) {

                        await redis.sRem(
                            "sessions:active",
                            id
                        );

                        continue;
                    }

                    const session =
                        JSON.parse(raw);

                    if (
                        session.status !==
                        "ACTIVE"
                    ) {

                        await redis.sRem(
                            "sessions:active",
                            id
                        );

                        continue;
                    }

                    // =================================================
                    // VERIFICA INATIVIDADE (FALTA DE HEARTBEAT)
                    // =================================================
                    const isStreaming = session.lastHeartbeat && (now - session.lastHeartbeat) < HEARTBEAT_TIMEOUT;

                    // Se inativo, encerra a sessão e libera o host
                    if (!isStreaming) {
                        console.log(`Worker: Sessão ${session.id} inativa. Encerrando...`);
                        await closeSession(session.id, false); // false indica que não foi um encerramento normal
                        continue;
                    }

                    // ==========================
                    // LÓGICA DE COBRANÇA PRÉ-PAGA
                    // ==========================

                    const timeSinceLastCharge = now - (session.lastChargeAt || session.startedAt);

                    if (timeSinceLastCharge >= MINUTE_IN_MS) {

                        // Antes de cobrar, verifica se há saldo para o próximo minuto
                        if (session.balance < CHARGE_PER_MINUTE) {
                            console.log(`Worker: Saldo insuficiente para o próximo minuto na sessão ${session.id}. Encerrando...`);
                            await walletsModel.updateWallet(session.walletId, { balance: session.balance > 0 ? session.balance : 0 });
                            await closeSession(session.id, false);
                            continue;
                        }

                        // Cobra o minuto
                        const newBalance = session.balance - CHARGE_PER_MINUTE;
                        session.balance = newBalance;
                        session.lastChargeAt = now; // Atualiza o tempo da última cobrança

                        // Atualiza a sessão no Redis
                        await redis.set(id, JSON.stringify(session));

                        // Atualiza o saldo no banco de dados
                        await walletsModel.updateWallet(session.walletId, { balance: newBalance });

                        // Notifica o cliente
                        getIO().to(String(session.userId)).emit("session:update", {
                            sessionId: session.id,
                            balance: newBalance.toFixed(2),
                            status: "ACTIVE"
                        });
                    }


                } finally {

                    await redis.del(
                        lockKey
                    );
                }
            }

        } catch (err) {

            console.error(
                "Erro worker:",
                err
            );
        }

    }, 1000);
};