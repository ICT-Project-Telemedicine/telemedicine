const dao = require('./dao');
const {logger} = require('../config/logger');
const { PATIENT, DOCTOR } = require('../config/variable');

exports.getCountAnswer = async (questionIdx) => {
    try {
        const [isExistQuestionRow] = await dao.isExistQuestion(questionIdx);
        if (!isExistQuestionRow.exist)
            return -1;
        // 기존에 존재하면 답변 개수 확인
        const [countAnswerRow] = await dao.countAnswer(questionIdx);
        return countAnswerRow;
    } catch(e) {
        logger.error(`[Service] getCountAnswer() - ${e}`);
    }
}

exports.addAnswer = async (questionIdx, userIdx, userStatus, title, content, countAnswer, isDoctorAnswer) => {
    if (!isDoctorAnswer) {
        countAnswer = userStatus === DOCTOR ? countAnswer : countAnswer+1;
    }

    const isDoctor = userStatus === DOCTOR ? true : false;
    
    try {
        await dao.createAnswer(questionIdx, userIdx, title, content, countAnswer, isDoctor);
    } catch (e) {
        logger.error(`[Service] addAnswer() - ${e}`);
    }
}