const hostController = require("../controllers/host.controller");

/*
    Host Routes
    - GET /hosts: Get all hosts
    - GET /hosts/:id: Get host by ID
    - POST /hosts: Create new host
    - PUT /hosts/:id: Update host by ID
    - DELETE /hosts/:id: Delete host by ID  
*/

module.exports =  function hostRoutes(app) {

    app.get('/api/hosts', hostController.getAll);
    app.get('/api/hosts/:id', hostController.getById);
    app.post('/api/hosts', hostController.create);
    app.put('/api/hosts/:id', hostController.update);
    app.delete('/api/hosts/:id', hostController.delete);
}