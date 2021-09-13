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

exports.getPatientName = async (idx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getPatientNameQuery = `SELECT name FROM user WHERE userIndex = ${idx}`;
    const [rows] = await connection.query(getPatientNameQuery);
    connection.release();
    return rows[0].name;
}

exports.getPatientBasicInfo = async (idx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getPatientBasicInfoQuery = `SELECT sex, age, height, weight, BMI FROM patient WHERE patientIndex = ${idx};`;
    const [rows] = await connection.query(getPatientBasicInfoQuery);
    connection.release();
    return rows;
}

exports.getPatientMeasureInfo = async (idx) => {
    // 210823 heedong
    const dynamo = new AWS.DynamoDB.DocumentClient();

    idx = parseInt(idx, 10);

    const params = {
        TableName: dynamo_config.table_name,
        ProjectionExpression: "payload, #timestamp",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        FilterExpression: 'userIndex = :idx',
        ExpressionAttributeValues: {
            ":idx": idx
        },
        ScanIndexForward: false,
        Limit: 5
    };

    const data = await dynamo.scan(params).promise();
    data.Items.reverse();

    return data.Items;
}

exports.getPatientCurrMeasureInfo = async (idx) => {
    const dynamo = new AWS.DynamoDB.DocumentClient();

    idx = parseInt(idx, 10);

    const params = {
        TableName: dynamo_config.table_name,
        ProjectionExpression: "payload, #timestamp",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        FilterExpression: 'userIndex = :idx',
        ExpressionAttributeValues: {
            ":idx": idx
        },
        ScanIndexForward: false,
        Limit: 1
    };

    const data = await dynamo.scan(params).promise();

    return data.Items;
}

exports.getDoctorInfo = async (idx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const getDoctorInfoQuery = `SELECT u1.name,
    (SELECT GROUP_CONCAT(u2.name SEPARATOR ',') FROM user u2 INNER JOIN manage m ON m.doctorIndex = ${idx} AND m.patientIndex = u2.userIndex) AS patientName,
    (SELECT GROUP_CONCAT(u2.userIndex SEPARATOR ',') FROM user u2 INNER JOIN manage m ON m.doctorIndex = ${idx} AND m.patientIndex = u2.userIndex) AS patientIndex
    FROM user u1 WHERE userIndex = ${idx};`;
    const [rows] = await connection.query(getDoctorInfoQuery);
    connection.release();
    return rows[0];
}

exports.getFullData = async (patientIdx) => {
    const idx = Number(patientIdx);
    const dynamo = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: dynamo_config.table_name,
        ProjectionExpression: "payload, #timestamp",
        ExpressionAttributeNames: {
            "#timestamp": "timestamp"
        },
        FilterExpression: 'userIndex = :idx',
        ExpressionAttributeValues: {
            ":idx": idx
        }
    };
    const data = await dynamo.scan(params).promise();
    return data.Items;
}

exports.getMyDoctor = async (patientIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = 'SELECT doctorIndex FROM manage WHERE patientIndex = ?;';
    const Params = [patientIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}

exports.getQuestionList = async (patientIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `SELECT id, title, createdAt, status FROM board_question WHERE author = ${patientIdx} AND status != 'DELETED';`;
    const [rows] = await connection.query(Query);
    connection.release();
    return rows;
}

exports.getQuestionDetail = async (questionIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `SELECT title, content, createdAt, updatedAt, status FROM board_question WHERE id = ${questionIdx};`;
    const [rows] = await connection.query(Query);
    connection.release();
    return rows;
}

exports.createNewQuestion = async (title, author, content, receiver) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = 'INSERT INTO board_question(title, author, content, receiver) VALUES (?, ?, ?, ?);';
    const Params = [title, author, content, receiver];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}

exports.updateQuestion = async (questionIdx, patientIdx, title, content) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
        UPDATE board_question
        SET title = ?, content = ?
        WHERE id = ? AND author = ? AND status = 'normal';
    `;
    const Params = [title, content, questionIdx, patientIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}

exports.deleteQuestion = async (questionIdx, patientIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
        UPDATE board_question
        SET status = 'deleted'
        WHERE id = ? AND author = ?;
    `;
    const Params = [questionIdx, patientIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}