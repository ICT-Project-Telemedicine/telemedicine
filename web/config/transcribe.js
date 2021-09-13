const AWS = require('aws-sdk');
const dynamo_config = require('../config/dynamodb');

AWS.config.update(dynamo_config.aws_remote_config);
const transcribeService = new AWS.TranscribeService();

const run = async (jobNameContains) => {
    try {
        const params = {
            JobNameContains: jobNameContains
        };
        const data = await transcribeService.getTranscriptionJob(params);
        console.log("Success", data);
        return data;
    } catch (err) {
        console.log("Error", err);
    }
};

module.exports = {
    run
};