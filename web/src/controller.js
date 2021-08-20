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
    return res.redirect(`/${identity}/${userIndex}`);
};

/**
 * 로그아웃 요청
 */
exports.logout = async function (req, res) {
    res.clearCookie('token');
    return res.redirect('/');
}

exports.patient = async function (req, res) {
    const patientIdx = parseInt(req.params.patientIdx, 10);
    const authUser = parseInt(req.verifiedToken.id, 10);

    // 최근 5일간 심박동수 & 체온 & 산소포화도 (추후 DynamoDB에서 불러올 것)
    const heartRate = [68, 70, 65, 73, 64];
    const temperature = [36.5, 35.7, 36.0, 37.1, 36.7];
    const oxygen = [98, 99, 93, 95, 96];
    const date = [];

    const patientName = await dao.getPatientInfo(patientIdx);

    // 잘못된 접근 - 환자 인덱스와 토큰의 인덱스가 다를 때
    if (patientIdx !== authUser) {
        logger.info(`Error Patient - patientIdx and token.id are different`);
        return res.redirect('/');
    }

    return res.render('patient.ejs', {patientIdx, patientName, heartRate, temperature, oxygen});
};

exports.patientMonitor = async function (req, res) {
    const patientIdx = parseInt(req.params.patientIdx, 10);
    const patientName = await dao.getPatientInfo(patientIdx);
    const authUser = parseInt(req.verifiedToken.id, 10);
    const heartRate = 68; // 심박동수 예시
    const temperature = 36.5; // 체온 예시
    const oxygen = 98; // 산소포화도 예시 

    // 잘못된 접근 - 환자 인덱스와 토큰의 인덱스가 다를 때
    if (patientIdx !== authUser) {
        logger.info(`Error Patient - patientIdx and token.id are different`);
        return res.redirect('/');
    }


    return res.render('patientMonitor.ejs', {patientName, heartRate, temperature, oxygen});
}

exports.doctor = async function (req, res) {
    const doctorIdx = parseInt(req.params.doctorIdx, 10);
    const authUser = parseInt(req.verifiedToken.id, 10);
    const patientIdx = parseInt(req.query.patient, 10);
    const rows = await dao.getDoctorInfo(doctorIdx);

    // 잘못된 접근 - 의사 인덱스와 토큰의 인덱스가 다를 때
    if (doctorIdx !== authUser) {
        logger.info(`Error Doctor - doctorIdx and token.id are different`);
        return res.redirect('/');
    }

    if (!patientIdx) {
        const doctorName = rows.name;
        const patientIdxList = rows.patientIndex.split(',')
        const patientNameList = rows.patientName.split(',');
        var patientList = [];
        for (var i = 0; i < patientIdxList.length; i++) {
            patientList.push({userIndex: patientIdxList[i], name: patientNameList[i]})
        };
        return res.render('doctor.ejs', {'doctorIdx': doctorIdx, 'doctorName': doctorName, 'patients': patientList});
    } else {
        // 환자 인덱스 DB에서 조회
        const patientIndexList = [1, 2, 3];
        const patientSet = new Set(patientIndexList);

        // 리스트에 없는 경우 
        if (!patientSet.has(patientIdx)) { return res.redirect(`/doctor/${doctorIdx}`); }
        else {
            // 리스트에 있는 경우
            // 환자 정보 조회
            const patientInfo = {
                'userIndex': 1,
                'name': '김희동'
            };

            return res.render('doctorMonitor.ejs', {'doctorIdx': doctorIdx, 'patientInfo': patientInfo});
        }
    }
}

exports.test = async function (req, res) {
    // dynamo 테스트 코드
    const items = await dao.findAll();
    return res.send({items});
}