const createSession = require('../services/session/create.service');
const closeSession = require('../services/session/close.service');
const { getAllActive } = require('../models/session.model');


const sessionController = {
    async create(req, res) {

        if(!req.user){
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if(!req.body) {
            return res.status(400).json({ error: 'Todos os campos devem ser preenchidos' });
        }

        const result = await createSession(req);
        return res.status(result?.status || 200).json(result);
    },

    async close(req, res) {

        if(!req.user){
            res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if(!req.body) {
            res.status(400).json({ error: 'Todos os campos devem ser preenchidos' });
        }

        
        const result = await closeSession(req);
        res.json(result);
    },

    async getAll(req, res) {
        const result = await getAllActive(req.user.id);
        res.json(result);
    }


};

module.exports = sessionController;