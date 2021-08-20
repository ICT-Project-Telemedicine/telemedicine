const { pool } = require('../config/database');
const AWS = require('aws-sdk');
const dynamo_config = require('../config/dynamodb');
AWS.config.update(dynamo_config.aws_remote_config);

exports.dynamoTest = async () => {
    const dynamo = new AWS.DynamoDB.DocumentClient();
    // 파라미터
    const params = {
        TableName: dynamo_config.table_name,
        KeyConditionExpression: 'patientId = :id',
        ExpressionAttributeValues: {
            ':id': 'dsadasdasd'
        }
    }
    const data = await dynamo.query(params).promise();
    return data.Items;
};

// 전체 조회
exports.findAll = async () => {
    const dynamo = new AWS.DynamoDB.DocumentClient();
    // 파라미터
    const params = {
        TableName: dynamo_config.table_name
    };

    const data = await dynamo.scan(params).promise();
    return data.Items;
}

exports.getUserIndex = async (id, info) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getUserIndexQuery = `SELECT userIndex FROM user WHERE id = ${id} AND info = ${info};`;
    const [rows] = await connection.query(getUserIndexQuery);
    connection.release();
    return rows[0].userIndex
}

exports.getPatientInfo = async (idx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getPatientInfoQuery = `SELECT name FROM user WHERE userIndex = ${idx}`;
    const [rows] = await connection.query(getPatientInfoQuery);
    connection.release();
    
    // 현재 unix timestamp 구하기 (DynamoDB 데이터 조회 목적)
    const currTime = String(Math.floor(new Date().getTime() / 1000));

    /*
    210820 Serin
    timestamp 기준으로 최근 2개만 불러오고자 했으나...
    Query key condition not supported라는 에러가 자꾸 발생
    */
    
    const dynamo = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: dynamo_config.table_name,
        ProjectionExpression: "userIndex, payload, #timestamp",
        KeyConditionExpression: "begins_with(#timestamp, :num)",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
            ":num": "1"
        },
        Limit: 2
    }

    // 주석 풀고 실행하면 에러 발생
    //const data = await dynamo.query(params).promise();
    //console.log('조회결과 >', data);


    // const params = {
    //     TableName: dynamo_config.table_name,
    //     IndexName: "timestamp-index"
    // }

    // await dynamo.scan(params, (err, data) => {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         const { Items } = data;
    //         console.log('조회 >>', Items);
    //     }
    // });

    return rows[0].name;
}

exports.getDoctorInfo = async (idx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getDoctorInfoQuery = `SELECT u1.name,
    (SELECT GROUP_CONCAT(u2.name SEPARATOR ',') FROM user u2 INNER JOIN manage m ON m.doctorIndex = ${idx} AND m.patientIndex = u2.userIndex) AS patientName,
    (SELECT GROUP_CONCAT(u2.userIndex SEPARATOR ',') FROM user u2 INNER JOIN manage m ON m.doctorIndex = ${idx} AND m.patientIndex = u2.userIndex) AS patientIndex
    FROM user u1 WHERE userIndex = ${idx};`;
    const [rows] = await connection.query(getDoctorInfoQuery);
    connection.release();
    return rows[0]
}