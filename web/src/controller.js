const jwt = require('jsonwebtoken');
const dynamodb = require('../config/dynamodb');
const {logger} = require('../config/logger');
const upload = require('../config/multer');
const dao = require('./dao');
const service = require('./service');
const calculate = require('./calculate');
const { PATIENT, DOCTOR } = require('../config/variable');

require('dotenv').config();
const secret = process.env.JWT_SIGNATURE;

/**
 * 인덱스 페이지 
 */
exports.index = async function (req, res) {
    const token = req.cookies.token;
    let userIndex;

    if (token) {
        const p = new Promise(
            (resolve, reject) => {
                jwt.verify(token, secret , (err, verifiedToken) => {
                    if(err) reject(err);
                    resolve(verifiedToken)
                })
            }
        );
        const onError = (error) => {
            res.clearCookie('token');
            return res.redirect('/');
        };
        p.then((verifiedToken)=>{
            const userIndex = verifiedToken.id;
            const status = verifiedToken.status;
            
            logger.info('Index - token');
            // 토큰 확인 (DB 조회)
            if(status == PATIENT)
                return res.redirect('/patient');
            else
                return res.redirect('/doctor');

        }).catch(onError);
    } else {
        logger.info('Index - none token');
        return res.render('index.ejs');
    }
};

/**
 * 로그인 요청
 */
 exports.login = async function (req, res) {
    res.clearCookie('token');
    const identity = req.query.identity;
    const code = req.body.inputCode;
    let userIndex = 0;
    let status = 0;
    
    // query string 및 inputCode validation check
    if (identity === 'patient') {
        // 지금 환자는 111, 이후에 DB 연결하면 조회하는 걸로 수정
        if (parseInt(code, 10) !== 111) {
            logger.error(`Error Login - non valid patient code`);
            return res.redirect('/');
        }
        //userIndex = 117;
        try {
            userIndex = await dao.getUserIndex(parseInt(code, 10), 0);
            status = PATIENT;
        } catch (e){
            logger.error(`Error : ${e}`);
            return res.redirect('/');
        }
        

    } else if (identity === 'doctor') {
        // 지금 의사는 222, 이후에 DB 연결하면 조회하는 걸로 수정
        if (parseInt(code, 10) !== 222) {
            logger.info(`Error Login - non valid doctor code`);
            return res.redirect('/');
        }
        //userIndex = 319;
        try {
            userIndex = await dao.getUserIndex(parseInt(code, 10), 1);
            status = DOCTOR;
        } catch (e){
            logger.error(`Error : ${e}`);
            return res.redirect('/');
        }

    } else {
        logger.info(`Error Login - non valid quert string`);
        return res.redirect('/');
    }

    //토큰 생성
    let token = await jwt.sign({
            id: userIndex,
            status: status
        },
        secret,
        {
            expiresIn: '2h',
            subject: 'user-info',
        }
    );

    res.cookie('token', token);
    return res.redirect(`/${identity}`);
};

/**
 * 로그아웃 요청
 */
exports.logout = async function (req, res) {
    res.clearCookie('token');
    return res.redirect('/');
}

exports.patient = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const patientName = await dao.getPatientName(patientIdx);

    // 최근 5일간 심박동수 & 체온 & 산소포화도 (추후 DynamoDB에서 불러올 것)
    const heartRate = [68, 70, 65, 73, 64];
    const temperature = [36.5, 35.7, 36.0, 37.1, 36.7];
    const oxygen = [98, 99, 93, 95, 96];
    const date = [];

    // dynamo 조회
    const patientMeasureInfo = await dao.getPatientMeasureInfo(patientIdx);

    let measurement = {};
    let heartRatee = [];
    let temperaturee = [];
    let oxygene = [];
    let datee = [];

    if (patientMeasureInfo.length >= 5) {
        patientMeasureInfo.forEach((e) => {
            let changeDate = new Date(Number(e.timestamp));
            let year = changeDate.getFullYear();
            let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
            let day = ('0' + changeDate.getDate()).slice(-2);
            let currDate = year + '-' + month + '-' + day;

            heartRatee.push(e.payload.bpm);
            temperaturee.push(e.payload.temperature);
            oxygene.push(e.payload.spo2);
            datee.push(currDate);
        });                
        measurement = {
            heartRate: heartRatee,
            temperature: temperaturee,
            oxygen: oxygene,
            date: datee
        }
    }
    return res.render('patient.ejs', {patientIdx, patientName, measurement, heartRate, temperature, oxygen});
};

exports.patientMonitor = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const rows = await dao.getPatientBasicInfo(patientIdx);
    const patientName = await dao.getPatientName(patientIdx);
    
    // 환자 기본 정보
    const patientBasicInfo = {
        'patientIdx': patientIdx,
        'name': patientName,
        'sex': rows[0].sex,
        'age': rows[0].age,
        'height': rows[0].height,
        'weight': rows[0].weight,
        'BMI': rows[0].BMI
    }

    // dynamo 조회
    const [patientCurrMeasureInfo] = await dao.getPatientCurrMeasureInfo(patientIdx);
    let changeDate = new Date(Number(patientCurrMeasureInfo.timestamp));
    let year = changeDate.getFullYear();
    let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
    let day = ('0' + changeDate.getDate()).slice(-2);
    let currDate = year + '-' + month + '-' + day;

    // 환자 의료 정보
    const currMeasureInfo = {
        heartRate: patientCurrMeasureInfo.payload.bpm,
        temperature: patientCurrMeasureInfo.payload.temperature,
        oxygen: patientCurrMeasureInfo.payload.spo2,
        date: currDate
    }

    // 의사 찾기
    const [findDoctorRow] = await dao.getMyDoctor(patientIdx);
    const doctorIdx = findDoctorRow.doctorIndex;

    return res.render('patientMonitor.ejs', {patientBasicInfo, currMeasureInfo, doctorIdx});
}

exports.doctor = async function (req, res) {
    const doctorIdx = req.verifiedToken.id;
    const patientIdx = parseInt(req.query.patient, 10);
    const rows = await dao.getDoctorInfo(doctorIdx);

    if (!patientIdx) {
        // 전체 환자
        const doctorName = rows.name;
        const patientIdxList = rows.patientIndex.split(',')
        const patientNameList = rows.patientName.split(',');
        let patientList = [];
        for (let i = 0; i < patientIdxList.length; i++) {
            const userIndex = patientIdxList[i];
            const name = patientNameList[i];

            // dynamo 조회
            const patientMeasureInfo = await dao.getPatientMeasureInfo(userIndex);

            let measurement = {};
            let heartRate = [];
            let temperature = [];
            let oxygen = [];
            let date = [];

            if (patientMeasureInfo.length >= 5) {
                patientMeasureInfo.forEach((e) => {
                    let changeDate = new Date(Number(e.timestamp));
                    let year = changeDate.getFullYear();
                    let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
                    let day = ('0' + changeDate.getDate()).slice(-2);
                    let currDate = year + '-' + month + '-' + day;

                    heartRate.push(e.payload.bpm);
                    temperature.push(e.payload.temperature);
                    oxygen.push(e.payload.spo2);
                    date.push(currDate);
                });                
                measurement = {
                    heartRate: heartRate,
                    temperature: temperature,
                    oxygen: oxygen,
                    date: date
                }
            };
            patientList.push({userIndex, name, measurement});
        };

        return res.render('doctor.ejs', {doctorIdx, doctorName, patientList});
    } else {
        // 특정 환자
        // 환자 인덱스 DB에서 조회
        const patientIdxList = rows.patientIndex.split(',');
        const patientIdxSet = new Set(patientIdxList);

        // 리스트에 없는 경우 
        if (!patientIdxSet.has(String(patientIdx))) {

            return res.redirect('/doctor');
        }  else {
            // 리스트에 있는 경우
            const rows = await dao.getPatientBasicInfo(patientIdx);
            const patientName = await dao.getPatientName(patientIdx);

            // 환자 기본 정보
            const patientBasicInfo = {
                'patientIdx': patientIdx,
                'name': patientName,
                'sex': rows[0].sex,
                'age': rows[0].age,
                'height': rows[0].height,
                'weight': rows[0].weight,
                'BMI': rows[0].BMI
            }

            // dynamo 조회
            const [patientCurrMeasureInfo] = await dao.getPatientCurrMeasureInfo(patientIdx);
            let changeDate = new Date(Number(patientCurrMeasureInfo.timestamp));
            let year = changeDate.getFullYear();
            let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
            let day = ('0' + changeDate.getDate()).slice(-2);
            let currDate = year + '-' + month + '-' + day;

            // 환자 의료 정보
            const currMeasureInfo = {
                'heartRate': patientCurrMeasureInfo.payload.bpm,
                'temperature': patientCurrMeasureInfo.payload.temperature,
                'oxygen': patientCurrMeasureInfo.payload.spo2,
                'date': currDate
            }

            // 이상 증상 파악
            const calculateInfo = calculate.calculate(patientBasicInfo, currMeasureInfo);

            return res.render('doctorMonitor.ejs', {doctorIdx, patientBasicInfo, currMeasureInfo, calculateInfo});
        }
    }
}

exports.getFullData = async function (req, res) {
    const patientIdx = req.query.patient;
    const row = await dao.getFullData(patientIdx);

    let heartRate = [];
    let temperature = [];
    let oxygen = [];
    let date = [];

    row.forEach((e) => {
        let changeDate = new Date(Number(e.timestamp));
        let year = changeDate.getFullYear();
        let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
        let day = ('0' + changeDate.getDate()).slice(-2);
        let currDate = year + '-' + month + '-' + day;
        heartRate.push(e.payload.bpm);
        temperature.push(e.payload.temperature);
        oxygen.push(e.payload.spo2);
        date.push(currDate);
    });

    heartRate.reverse();
    temperature.reverse();
    oxygen.reverse();
    date.reverse();

    return res.render('fullData.ejs', {heartRate, temperature, oxygen, date});
}

exports.questionList = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const patientName = await dao.getPatientName(patientIdx);
    const questionList = await dao.getQuestionList(patientIdx);

    questionList.forEach((e) => {
        let changeDate = new Date(Number(e.createdAt));
        let year = changeDate.getFullYear();
        let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
        let day = ('0' + changeDate.getDate()).slice(-2);
        e.createdAt = year + '-' + month + '-' + day;
    })

    return res.render('questionList.ejs', {patientName, questionList});
}

exports.questionDetail = async function (req, res) {
    const questionIdx = req.params.questionIdx;
    const patientIdx = req.verifiedToken.id;
    const patientName = await dao.getPatientName(patientIdx);
    const [questionDetail] = await dao.getQuestionDetail(questionIdx);

    let changeDate = new Date(Number(questionDetail.createdAt));
    let year = changeDate.getFullYear();
    let month = ('0' + (changeDate.getMonth() + 1)).slice(-2);
    let day = ('0' + changeDate.getDate()).slice(-2);
    questionDetail.createdAt = year + '-' + month + '-' + day;
    let changeDate2 = new Date(Number(questionDetail.updatedAt));
    let year2 = changeDate2.getFullYear();
    let month2 = ('0' + (changeDate2.getMonth() + 1)).slice(-2);
    let day2 = ('0' + changeDate2.getDate()).slice(-2);
    questionDetail.updatedAt = year2 + '-' + month2 + '-' + day2;

    // 예시
    const replyList = [
        {
            "name": "한이음",
            "content": "답변 도움이 되었습니다. 감사합니다."
        },
        {
            "name": "홍지후",
            "content": "다행이네요. 모니터링 한 번 합시다."
        }
    ]
    
    // 의사 답변 있는 경우 답변 조회
    if (questionDetail.status === 'clear') {
        const [answer] = await dao.getAnswer(questionIdx);
        let changeDate3 = new Date(Number(answer.createdAt));
        let year3 = changeDate3.getFullYear();
        let month3 = ('0' + (changeDate3.getMonth() + 1)).slice(-2);
        let day3 = ('0' + changeDate3.getDate()).slice(-2);
        answer.createdAt = year3 + '-' + month3 + '-' + day3;
        let changeDate4 = new Date(Number(answer.updatedAt));
        let year4 = changeDate4.getFullYear();
        let month4 = ('0' + (changeDate4.getMonth() + 1)).slice(-2);
        let day4 = ('0' + changeDate4.getDate()).slice(-2);
        answer.updatedAt = year4 + '-' + month4 + '-' + day4;
        return res.render('questionDetail.ejs', {questionIdx, patientName, questionDetail, answer, replyList});
    }
    return res.render('questionDetail.ejs', {questionIdx, patientName, questionDetail});
}

exports.createQuestion = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const { title,  content } = req.body;

    if (!title || !content) {
        logger.error("POST /question - unvalid parameter");
        return res.sendStatus(400);
    }

    try {
        const [row] = await dao.getMyDoctor(patientIdx);
        const doctorIdx = row.doctorIndex;
        await dao.createNewQuestion(title, patientIdx, content, doctorIdx);
        logger.info('POST /question');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`POST /question - ${e}`);
        return res.sendStatus(500);
    }
}

exports.updateQuestion = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const { questionIdx, title,  content } = req.body;

    if (!questionIdx || !title || !content || Number.isNaN(questionIdx)) {
        logger.error("PUT /question - unvalid parameter");
        return res.sendStatus(400);
    }

    try {
        const updatedQuestion = await dao.updateQuestion(questionIdx, patientIdx, title, content);
        logger.info('PUT /question');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`PUT /question - ${e}`);
        return res.sendStatus(500);
    }
}

exports.deleteQuestion = async function (req, res) {
    const patientIdx = req.verifiedToken.id;
    const questionIdx = req.params.questionIdx;

    if (!questionIdx || Number.isNaN(questionIdx)) {
        logger.error("DELETE /question - unvalid parameter");
        return res.sendStatus(400);
    }

    try {
        await dao.deleteQuestion(questionIdx);
        logger.info('DELETE /question');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`DELETE /question - ${e}`);
        res.sendStatus(500);
    }
}

exports.createAnswer = async function (req, res) {
    const userIdx = req.verifiedToken.id;
    const userStatus = req.verifiedToken.status;
    const { questionIdx, title, content } = req.body;

    if (!questionIdx || !content || Number.isNaN(questionIdx)) {
        logger.error("POST /answer - unvalid parameter");
        return res.sendStatus(400);
    }

    try {
        // 질문 유효한지 확인
        const countAnswerRow = await service.getCountAnswer(questionIdx);
        // 질문이 없는 경우
        if (!countAnswerRow || countAnswerRow === null) {
            logger.error("POST /answer - not exist question");
            return res.sendStatus(400);
        }
        const isDoctorAnswer = countAnswerRow.doctorAnswer;
        const countAnswer = countAnswerRow.count;
        // 답변 생성
        await service.addAnswer(questionIdx, userIdx, userStatus, title, content, countAnswer, isDoctorAnswer);
        logger.info('POST /answer');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`POST /answer - ${e}`);
        return res.sendStatus(500);
    }
}

exports.updateAnswer = async function (req, res) {
    const userIdx = req.verifiedToken.id;
    const {
        answerId,
        title,
        content
    } = req.body;

    if (!answerId || !content || Number.isNaN(answerId)) {
        logger.error("PUT /answer - unvalid parameter");
        return res.sendStatus(400);
    }

    try {
        // 수정
        const check = await service.updateAnswer(answerId, userIdx, title, content);
        if (!check) {
            logger.info('PUT /answer - unvalid request');
            return res.sendStatus(400);
        }
        logger.info('PUT /answer');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`PUT /answer - ${e}`);
        return res.sendStatus(500);
    }

}

exports.deleteAnswer = async function (req, res) {
    const userIdx = req.verifiedToken.id;
    const answerIdx = req.params.answerIdx;

    if (!answerIdx || Number.isNaN(answerIdx)) {
        logger.error(`DELETE /answer - unvalid parameter`);
        return res.sendStatus(400);
    }

    try {
        const check = await service.deleteAnswer(userIdx, answerIdx);
        if (!check) {
            logger.info('DELETE /answer - unvalid request');
            return res.sendStatus(400);
        }
        logger.info('DELETE /answer');
        return res.sendStatus(200);
    } catch(e) {
        logger.error(`DELETE /answer - ${e}`);
        return res.sendStatus(500);
    }
}

exports.modify = async function (req, res) {
    const userIdx = req.verifiedToken.id;
    const postIdx = req.params.postIdx;

    // 질문(환자) 수정인지 답변(의사) 수정인지 확인 (환자 0 / 의사 1)
    const [rows] = await dao.userInfo(userIdx);
    const info = rows.info;

    return res.render('modify.ejs', {postIdx, info});
}

exports.saveVideoStream = async function (req, res) {
    upload(req, res, function(err) {
        if (err) {
            return res.sendStatus(500);
        }
        return res.sendStatus(200);
    });
}

exports.test = async function (req, res) {
    // dynamo 테스트 코드
    const items = await dao.findAll();
    return res.send({items});
}