const dao = require('./dao');
const {logger} = require('../config/logger');
const { PATIENT, DOCTOR } = require('../config/variable');

exports.getCountAnswer = async (questionIdx) => {
    try {
        const isExistQuestion = await dao.isExistQuestion(questionIdx);
        if (!isExistQuestion)
            return -1;
        // 기존에 존재하면 답변 개수 확인
        const [countAnswerRow] = await dao.countAnswer(questionIdx);
        return countAnswerRow;
    } catch(e) {
        logger.error(`[Service] getCountAnswer() - ${e}`);
    }
}

exports.addAnswer = async (questionIdx, userIdx, userStatus, title, content, countAnswer, isDoctorAnswer) => {
    if (!isDoctorAnswer)
        countAnswer = userStatus === DOCTOR ? countAnswer : countAnswer+1;

    const isDoctor = userStatus === DOCTOR ? true : false;
    
    try {
        await dao.createAnswer(questionIdx, userIdx, title, content, countAnswer, isDoctor);
    } catch (e) {
        logger.error(`[Service] addAnswer() - ${e}`);
    }
}

exports.updateAnswer = async (answerId, author, title, content) => {
    try {
        // 수정할 수 있는 질문인지 확인
        const answer = await dao.findAnswer(answerId);
        // 작성자가 다름
        if (answer.author !== author)
            return false;
        await dao.updateAnswer(answerId, title, content);
        return true;
    } catch (e) {
        logger.error(`[Service] updateAnswer() - ${e}`);
    }
}