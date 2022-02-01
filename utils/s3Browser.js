const AWS = require("aws-sdk");
const fs = require("fs");
// function s3Upload(remoteS3Key, localFilePath, contentType, origIMgPath ,cacheControl) {
//   return new Promise((resolve, reject) => {
//     const s3 = new AWS.S3({
//       accessKeyId: process.env.AWS_ID,
//       secretAccessKey: process.env.AWS_SECRET,
//     });
//     // Reading the file from local path and uploading to S3 Bucket
//     console.log(
//       "s3Upload localFile: " + localFilePath + " | removeFile: " + remoteS3Key
//     );

//     fs.readFile(localFilePath, (err, fileBody) => {
//       if (err) {
//         console.log("Error", err);
//       } else {
//         let params = {
//           Bucket: process.env.AWS_BUCKET_NAME,
//           Key: remoteS3Key,
//           Body: fileBody,
//           ContentType: contentType,
//           CacheControl: cacheControl,
//         };
//         s3.upload(params, (err, result) => {
//           if (err) {
//             console.log("Error", err);
//             reject("S3 Upload Error " + err);
//           } else {
//             resolve("S3 Upload Complete " + result);
//             console.log("S3 Response", result);
//             deleteFromlocal(localFilePath);
//             // deleteFromlocal(origIMgPath);
//             // if (!localFilePath.includes(".mp3")) {
//             //   console.log("hello world");

//             // }
//           }
//         });
//       }
//     });
//   });
// }
function s3Upload(remoteS3Key, localFilePath, contentType, origIMgPath ,cacheControl) {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
    });
    // Reading the file from local path and uploading to S3 Bucket
    console.log(
      "s3Upload localFile: " + localFilePath + " | removeFile: " + remoteS3Key
    );

 try{
  fs.readFile(localFilePath, (err, fileBody) => {
    if (err) {
      console.log("Error", err);
    } else {
      let params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: remoteS3Key,
        Body: fileBody,
        ContentType: contentType,
        CacheControl: cacheControl,
      };
      s3.upload(params, (err, result) => {
        if (err) {
          console.log("Error", err);
          reject("S3 Upload Error " + err);
        } else {
          resolve("S3 Upload Complete " + result);
          console.log("S3 Response", result);
          deleteFromlocal(localFilePath);
          // deleteFromlocal(origIMgPath);
          // if (!localFilePath.includes(".mp3")) {
          //   console.log("hello world");

          // }
        }
      });
    }
  });
 }catch(err){
 console.log(err);
 return err;
 }  

  });
}

function s3MultipleUpload(listFiles, cb) {
  var s3UploadsElements = [];
  listFiles.forEach((fileElement) => {
    console.log(fileElement);
    s3UploadsElements.push(
      s3Upload(
        fileElement.remoteFileKey,
        fileElement.localFileKey,
        fileElement.contentType,
        fileElement.origIMgPath,
        fileElement.cacheControl == undefined
          ? "max-age=3600"
          : fileElement.cacheControl
          
      )
    );
  });

  Promise.all(s3UploadsElements).then((results) => {
    console.log("s3Browser s3MultipleUpload Completed..");
    console.log(results);
    cb(null, results);
  });
}

function deleteFromlocal(path) {
  try {
    fs.unlinkSync(path);
    //file removed
  } catch(err) {
    console.error(err)
  }
}
function s3Delete(s3_key) {
  return new Promise((resolve, reject) => {
    //console.log(s3_key + fileName);
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
    });
    let params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3_key,
    };
    s3.deleteObject(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject("S3 Upload Error " + err);
      } else {
        resolve("S3 Upload Complete " + data);
        console.log("S3 Response" + data);
      }
    });
  });
}
function emptyBucket(s3Key) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });
  var bucketParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Prefix: s3Key,
  };
  s3.listObjects(bucketParams, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      // console.log("Success", data.Contents);
      params = { Bucket: process.env.AWS_BUCKET_NAME };
      params.Delete = { Objects: [] };
      data.Contents.forEach((content) => {
        // params.Delete.Objects.push({Key: content.Key});
        console.log(content.Key);
        s3.deleteObject(
          {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: content.Key,
          },
          (err, data) => {
            if (err) console.log(err);
            console.log(data);
          }
        );
      });
    }
  });
}
async function uploadBgImage (BucketName,bgOutputPath,s3_path_key,bgImgName,contentType){
  const CHUNK_SIZE = 10000000;
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });
  let params = {
    Bucket: BucketName,
    Body: fs.createReadStream(bgOutputPath , {highWaterMark: CHUNK_SIZE}),
    Key: `${s3_path_key}/bg_${bgImgName}`,
    ContentType: contentType,
  };
  await s3.upload(params, async (err, result) => {
    if (err) {
      console.log('Error occured while trying to upload to S3 bucket', err);
    } else {
      // resolve("S3 Upload Complete " + result);
      console.log("S3 Response", result);
     // moviesThumbDeleteFroms3(movieID);
      fs.unlinkSync(bgOutputPath); // Empty temp folder
    }

  });
}
module.exports = {
  s3Upload: s3Upload,
  s3Delete: s3Delete,
  s3MultipleUpload: s3MultipleUpload,
  emptyBucket: emptyBucket,
  uploadBgImage
};