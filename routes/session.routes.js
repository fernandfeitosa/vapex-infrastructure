const sessionController = require('../controllers/session.controller');

module.exports = (app) => {

    app.get('/api/sessions', sessionController.getAll);

    // Create new session
    app.post('/api/sessions/create', sessionController.create);

    // Close session
    app.post('/api/sessions/close', sessionController.close);
};
