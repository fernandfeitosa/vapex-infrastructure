const Host = require('../models/host.model');

/*
    Host Controller
    - getAll: Get all hosts
    - getById: Get host by ID
    - create: Create new host
    - update: Update host by ID
    - delete: Delete host by ID  
*/

module.exports = {
    async getAll(req, res) {
        try {
            const hosts = await Host.getAllHosts();
            res.json(hosts);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }   
    },

    async getById(req, res) {   
        try {
            const host = await Host.getHostById(req.params.id);
            if (host) {
                res.json(host);
            } else {
                res.status(404).json({ error: 'Host not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req, res) {
        try {
            const result = await Host.createHost(req.body);
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async update(req, res) {
        try {
            const result = await Host.updateHost(req.params.id, req.body);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async delete(req, res) {    
        try {
            const result = await Host.deleteHost(req.params.id);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

