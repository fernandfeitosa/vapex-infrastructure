const Wallet = require('../models/wallets.model');
const { getIO } = require("../sockets/socket");

module.exports = {
  
    getById: async (req, res) => {
        try {
         
            const wallet = await Wallet.getWalletById(req.user.id);

            if (wallet) {
                res.json({
                    "success": true,
                    "message": "💸 Wallet encontrada",
                    "data": {
                        "id": wallet.id,
                        "user_id": req.user.id,
                        "balance": wallet.balance,
                        "currency": wallet.Wallet,
                        "status": wallet.status,
                        "created_at": wallet.created_at,
                        "updated_at": wallet.updated_at
                    }
                });
            } else {
                res.status(201).json({
                    "success": false,
                    "message": "☠️ Wallet inexistente"+req.user.id
                });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    create: async (req, res) => {
        try {
            const result = await Wallet.createWallet(req.body);
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    update: async (req, res) => {
        try {
            const result = await Wallet.updateWallet(req.params.id, req.body);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    deposit: async (req, res) => {
        try {

            if(!req.body.amount) {
                res.status(201).json({
                    "success": false,
                    "message": "💰 Informe o valor a ser depositado"
                });
            }

            if(req.body.amount <= 0) {
                res.status(201).json({
                    "success": false,
                    "message": "💰 Informe um valor maior que zero"
                });
            }

            
            const result = await Wallet.deposit(req.user.id, req.body.amount);

            if(!result) {
                res.status(201).json({
                    "success": false,
                    "message": "☠️ Wallet inexistente"
                });
            }

            if(result.error) {
                res.status(201).json({
                    "success": false,
                    "message": result.error
                });
            }

            if(result.message) {
                res.status(201).json({
                    "success": false,
                    "message": result.message
                });
            }
            

            getIO().to(req.user.id).emit("wallet:update", {
                        userId: result.user_id,
                        balance: result.balance,
            });
            
           

            res.json({
                "success": true,
                "message": "💰 Deposito realizado com sucesso",
                "data": result
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getBalance: async (req, res) => {
        try {
            const result = await Wallet.getBalance(req.user.id);

            if(result) {
                res.json(result);
            } else {
                res.status(201).json({
                    "success": false,
                    "message": "☠️ Wallet inexistente"
                });
            }

            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
}