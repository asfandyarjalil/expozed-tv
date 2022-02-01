// const AWS = require("aws-sdk");
// const fs = require("fs");
// function s3Upload(s3_key) {
//   const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ID,
//     secretAccessKey: process.env.AWS_SECRET,
//   });
//   let params = {
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: s3_key,
//   };
//   s3.upload(params, (err, result) => {
//     if (err) {
//       console.log("Error", err);
//     } else {
//       console.log("S3 Response", result);
//       deleteFromlocal(localFilePath);
//       // if (!localFilePath.includes(".mp3")) {
//       //   console.log("hello world");

//       // }
//     }
//   });
// }
const AWS = require("aws-sdk");
const fs = require("fs");
function s3Upload(s3_key, localFilePath) {
  console.log("s3 function callsssss");
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });
  console.log(s3_key);
  // Reading the file from local path and uploading to S3 Bucket
  fs.readFile(localFilePath, (err, fileBody) => {
    if (err) {
      console.log("Error", err);
    } else {
      let params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3_key,
        Body: fileBody,
      };
      console.log(params);
      s3.upload(params, (err, result) => {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("S3 Response", result);
          //deleteFromlocal(localPath + localFileName);
        }
      });
    }
  });
}
function deleteFromlocal(path) {
  fs.unlinkSync(path);
}
module.exports = {
  s3Upload: s3Upload,
};
