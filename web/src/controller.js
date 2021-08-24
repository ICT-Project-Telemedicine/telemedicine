const jwt = require('jsonwebtoken');
const dynamodb = require('../config/dynamodb');
const {logger} = require('../config/logger');
const dao = require('./dao');

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
            
            logger.info('Index - token');
            // 토큰 확인 (DB 조회)
            if(userIndex == 117)
                return res.redirect('/patient/117');
            else
                return res.redirect('/doctor/319');

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
    
    // query string 및 inputCode validation check
    if (identity === 'patient') {
        // 지금 환자는 111, 이후에 DB 연결하면 조회하는 걸로 수정
        if (parseInt(code, 10) !== 111) {
            logger.info(`Error Login - non valid patient code`);
            return res.redirect('/');
        }
        //userIndex = 117;
        userIndex = await dao.getUserIndex(parseInt(code, 10), 0);

    } else if (identity === 'doctor') {
        // 지금 의사는 222, 이후에 DB 연결하면 조회하는 걸로 수정
        if (parseInt(code, 10) !== 222) {
            logger.info(`Error Login - non valid doctor code`);
            return res.redirect('/');
        }
        //userIndex = 319;
        userIndex = await dao.getUserIndex(parseInt(code, 10), 1);

    } else {
        logger.info(`Error Login - non valid quert string`);
        return res.redirect('/');
    }

    //토큰 생성
    let token = await jwt.sign({
            id: userIndex,
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
    const patientName = await dao.getPatientName(patientIdx);

    const heartRate = 68; // 심박동수 예시
    const temperature = 36.5; // 체온 예시
    const oxygen = 98; // 산소포화도 예시 

    return res.render('patientMonitor.ejs', {patientName, heartRate, temperature, oxygen});
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
        if (!patientIdxSet.has(patientIdx)) {
            return res.redirect('/doctor');
        }  else {
            // 리스트에 있는 경우
            // 환자 기본 정보 (성별, 나이, 키, 몸무게, BMI)
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

            return res.render('doctorMonitor.ejs', {doctorIdx, patientBasicInfo});
        }
    }
}

exports.test = async function (req, res) {
    // dynamo 테스트 코드
    const items = await dao.findAll();
    return res.send({items});
}