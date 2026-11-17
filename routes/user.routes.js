const userController = require('../controllers/user.controller');

module.exports = function userRoutes(app) {

    // Get all users    
    app.get('/api/users', userController.getAll);

    // Get user by ID
    app.get('/api/users/:id', userController.getById);

    // Create new user
    app.post('/api/users', userController.create);

    // Update user
    app.put('/api/users/:id', userController.update);

    // Delete user
    app.delete('/api/users/:id', userController.delete);
}