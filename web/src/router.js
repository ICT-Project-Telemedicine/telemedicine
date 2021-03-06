module.exports = function(app){
    const controller = require('./controller');
    const auth = require('../config/auth');

    app.get('/', controller.index);
    app.post('/login', controller.login);
    app.get('/logout', controller.logout);

    app.get('/patient', auth, controller.patient);
    app.get('/doctor', auth, controller.doctor);
    app.get('/patient/monitor', auth, controller.patientMonitor);
    app.get('/fullData', auth, controller.getFullData);
    app.get('/prescription', auth, controller.getPrescription);

    app.get('/question', auth, controller.questionList);
    app.get('/question/:questionIdx', auth, controller.questionDetail);
    app.post('/question', auth, controller.createQuestion);
    app.put('/question', auth, controller.updateQuestion);
    app.delete('/question/:questionIdx', auth, controller.deleteQuestion);

    app.post('/answer', auth, controller.createAnswer);
    app.put('/answer', auth, controller.updateAnswer);
    app.delete('/answer/:answerIdx', auth, controller.deleteAnswer);

    app.get('/question-modify/:postIdx', auth, controller.modify); // 질문 수정 페이지 렌더링용
    app.get('/answer-modify/:postIdx', auth, controller.modify); //답변 수정 페이지 렌더링용

    app.post('/record', controller.saveVideoStream);

    app.get('/test', controller.test);
};