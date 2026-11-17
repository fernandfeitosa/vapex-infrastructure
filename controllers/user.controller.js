const User = require('../models/user.model');

module.exports = {
    getAll: async (req, res) => {
        try {
            const users = await User.getAll();  
            res.json(users);
        } catch (err) {
          
        }
    },

    getById: async (req, res) => {
        try {
            const user = await User.getById(req.params.id);
            if (user) {
                res.json(user);
            } else {
                res.json({ error: 'User not found' });
            }
        } catch (err) {
       
        }   
    },

    create: async (req, res) => {
        try {
            const result = await User.create(req.body);
            res.json(result);
        } catch (err) {
            
        }
    },

    update: async (req, res) => {
        try {
            const user_id = req.user.id;
            const result = await User.update(user_id, req.body);
            res.json(result);
        } catch (err) {
           
        }

    },

    delete: async (req, res) => {
        try {           
             
            const user_id = req.user.id;
            const result = await User.delete(user_id);
            
            res.json(result);
        } catch (err) {
           
        }   
    },
    
}