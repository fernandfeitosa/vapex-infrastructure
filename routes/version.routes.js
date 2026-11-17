const versionController = require('../controllers/version.controller');

/*
    Version Routes
    - GET /api/version: Get app version info
*/

module.exports = function versionRoutes(app) {
    app.get('/api/version', versionController.getVersion);
};
