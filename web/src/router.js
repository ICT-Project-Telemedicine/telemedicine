module.exports = function(app){
    const controller = require('./controller');
    const auth = require('../config/auth');

    app.get('/', controller.index);
    app.post('/login', controller.login);
    app.get('/logout', controller.logout);

    app.get('/patient', auth, controller.patient);
    app.get('/doctor', auth, controller.doctor);
    app.get('/patient/:patientIdx/monitor', auth, controller.patientMonitor);
    app.get('/fullData', auth, controller.getFullData);
    
    // app.get('/question', auth, controller.readAllQuestion);
    // app.get('/question/:id', auth, controller.readOneQeustion);
    app.post('/question', auth, controller.createQuestion);
    // app.post('/answer', auth, controller.createAnswer);

    app.get('/test', controller.test);
};