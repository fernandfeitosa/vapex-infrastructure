const HomeModel = require('../models/home.model');

module.exports = {
    getAll: async (req, res) => {


       const userAndWallet = await HomeModel.getUserAndWallet(req.user.id);

        res.json({
            success: true,
            data: userAndWallet
        }); 
    }
}