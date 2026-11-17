const parearService = require('../services/sunschine/parear.service');

module.exports = {

    parear: async (req, res) => {


        if(!req.query.pincode) {
            res.status(201).json({ success: false, message: 'Informe o pin' }); 
        }

        


        const result = await parearService.parear(Math.floor(Math.random() * 1000000).toString(),req.query.pincode);

        console.log(result);
        
        

        res.json(result);
    }

}