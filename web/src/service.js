const dao = require('./dao');
const {logger} = require('../config/logger');
const { PATIENT, DOCTOR } = require('../config/variable');

exports.getCountAnswer = async (questionIdx) => {
    try {
        const isExistQuestion = await dao.isExistQuestion(questionIdx);
        console.log('isExist >', isExistQuestion);

        if (!isExistQuestion)
            return null;
        // 기존에 존재하면 답변 개수 확인
        let [countAnswerRow] = await dao.countAnswer(questionIdx);
        if (isExistQuestion) {
            const isFirstDeleted = await dao.isFirstDeleted(questionIdx);
            if (isFirstDeleted === 'deleted') countAnswerRow.count -= 1;
        }
        return countAnswerRow;
    } catch(e) {
        logger.error(`[Service] getCountAnswer() - ${e}`);
        return null;
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
        return false;
    }
}

exports.updateAnswer = async (answerId, author, title, content) => {
    try {
        // 수정할 수 있는 질문인지 확인
        const answer = await dao.findAnswer(answerId);
        // 해당 답변 없음 or 작성자가 다름
        if (!answer || answer.author !== author)
            return false;
        await dao.updateAnswer(answerId, title, content);
        return true;
    } catch (e) {
        logger.error(`[Service] updateAnswer() - ${e}`);
        return false;
    }
}

exports.deleteAnswer = async (author, answerIdx) => {
    try {
        // 삭제할 수 있는 답변인지 확인
        console.log('author, answerIdx', author, answerIdx);
        const answer = await dao.findAnswer(answerIdx);
        if (!answer || answer.author !== author)
            return false;

        // 첫 답변인 경우 질문 status clear => normal 변경
        const isFirst = await dao.isFirst(answerIdx);
        if (isFirst === 0) {
            const questionIdx = await dao.getQuestionIdFromAnswer(answerIdx);
            const updateStatus = await dao.updateQuestionStatus(questionIdx);
        }
        await dao.deleteAnswer(answerIdx);
        return true;
    } catch (e) {
        logger.error(`[Service] deleteAnswer() - ${e}`);
        return false;
    }
}