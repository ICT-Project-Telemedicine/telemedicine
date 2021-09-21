const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const moment = require('moment');
require('dotenv').config();

const s3 = new aws.S3({
  accessKeyId: process.env.DYNAMO_ACCESSKEY,
  secretAccessKey: process.env.DYNAMO_SECRET_ACCESSKEY,
  region: process.env.DYNAMO_REGION
})

const storage = multerS3({
    s3: s3,
    bucket: 'hanium-telemedicine',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
        cb(null, "video/1_" + moment().format('YYYYMMDDHHmmss') + "_" + file.originalname)
    }
})
  
  const upload = multer({ storage: storage }).single("file");
  
  module.exports = upload;