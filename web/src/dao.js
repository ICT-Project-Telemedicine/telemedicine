const { pool } = require('../config/database');
const {logger} = require('../config/logger');
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
    return;
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
    return;
}

exports.deleteQuestion = async (questionIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
        UPDATE board_question
        SET status = 'deleted'
        WHERE id = ?;
    `;
    const Params = [questionIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return;
}

exports.isExistQuestion = async (questionIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
    SELECT EXISTS (SELECT * FROM board_question WHERE id = ? AND status != 'deleted') AS 'exist';
    `;
    const Params = [questionIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows[0].exist;
}

exports.countAnswer = async (questionIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
    SELECT
    (SELECT EXISTS (SELECT * FROM board_answer WHERE questionId = ? AND \`order\` = 0)) AS doctorAnswer,
    (SELECT count(*) FROM board_answer WHERE questionId = ?) AS \`count\`;
    `;
    const Params = [questionIdx, questionIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows;
}

exports.createAnswer = async (questionIdx, userIdx, title, content, countAnswer, isDoctor) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const createAnswerQuery = `
    INSERT INTO board_answer(questionId, author, \`order\`, title, content)
    VALUES (?, ?, ?, ?, ?);
    `;
    const createAnswerParams = [questionIdx, userIdx, countAnswer, title, content];
    const readQuestionQuery = `
    UPDATE board_question
    SET status = 'clear'
    WHERE id = ? AND status = 'normal';
    `;
    const readQuestionParams = [questionIdx];
    if (isDoctor) {
        try {
            await connection.beginTransaction();
            await connection.query(createAnswerQuery, createAnswerParams);
            if (countAnswer === 0)
                await connection.query(readQuestionQuery, readQuestionParams);
            await connection.commit();
        } catch(e) {
            await connection.rollback();
            logger.error(`[Dao] createAnswer - ${e}`);
        } finally {
            connection.release();
        }
    } else {
        await connection.query(createAnswerQuery, createAnswerParams);
        connection.release();
    }
    return;
}

exports.findAnswer = async (id) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
    SELECT author, title, content, createdAt, updatedAt FROM board_answer WHERE id = ? AND status = 'normal';
    `;
    const Params = [id];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return rows[0];
}

exports.updateAnswer = async (id, title, content) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
    UPDATE board_answer
    SET title = ?, content = ?
    WHERE id = ? AND status = 'normal';
    `;
    const Params = [title, content, id];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return;
}

exports.deleteAnswer = async (answerIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const Query = `
        UPDATE board_answer
        SET status = 'deleted'
        WHERE id = ?;
    `;
    const Params = [answerIdx];
    const [rows] = await connection.query(Query, Params);
    connection.release();
    return;
}