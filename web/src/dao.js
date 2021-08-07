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