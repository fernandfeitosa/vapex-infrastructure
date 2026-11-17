const { getWalletById } = require("../models/wallet.model");


module.exports = {
    getUserWalletById: (req, res) => {

        if(!req.user) {
            res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if(!req.params.id) {
            res.status(400).json({ error: 'Id inválido' });
        }

        if(req.user.id !== req.params.id) {
            res.status(401).json({ error: 'Usuário não autorizado' });
        }


        

        res.json(getWalletById(req.user.id));
    }

};