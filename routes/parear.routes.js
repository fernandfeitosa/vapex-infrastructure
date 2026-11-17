
const parearController = require('../controllers/parear.controller');

module.exports = (app) => {

    app.post('/api/sunschine/parear', parearController.parear);
}