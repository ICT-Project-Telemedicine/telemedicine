module.exports = function(app){
    const controller = require('./controller');
    const auth = require('../config/auth');

    app.get('/', controller.index);
    app.post('/login', controller.login);
    app.get('/logout', controller.logout);

    app.get('/patient', auth, controller.patient);
    app.get('/doctor', auth, controller.doctor);
    app.get('/patient/:patientIdx/monitor', auth, controller.patientMonitor);
    
    app.get('/test', controller.test);
};