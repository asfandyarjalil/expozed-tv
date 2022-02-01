const sharp = require("sharp");

function resizeImage(originalFilePath, height, outputFilePath) {
  return new Promise((resolve, reject) => {
    console.log(originalFilePath + "     " + outputFilePath);

    sharp(originalFilePath)
      .resize({
        fit: sharp.fit.contain,
        height: height,
      })
      .toFile(outputFilePath, (err, info) => {
        if (err) {
          reject("Resize Failed with Error : " + err);
        } else {
          resolve("Resize Done Successfully : " + info);
        }
      });
  });
}
// function videoThumbnail() {
//   return new Promise((resolve, reject) => {
//     ffmpeg({ source: localImagePath + "/" + localImageName + ".mp4" })
//       .on("filenames", (filenames) => {
//         console.log("Created file names", filenames);
//       })
//       .on("end", () => {
//         resolve("Thumbnails generated");
//       })
//       .on("error", (err) => {
//         reject("Error", err);
//       })
//       .takeScreenshots(
//         {
//           filename: localImageName + ".png",
//           timemarks: [1],
//           folder: localImagePath,
//         },
//         "."
//       );
//   });
// }
function resizeAll(listImages, cb) {
  var resizeElements = [];
  listImages.forEach((fileElement) => {
    console.log(fileElement);
    resizeElements.push(
      resizeImage(
        fileElement.originalImagePath,
        fileElement.toHeight,
        fileElement.outputPath
      )
    );
  });

  Promise.all(resizeElements).then((results) => {
    console.log("ImageResizer resizeElements : ");
    console.log(results);
    cb(null, results);
  });
}

module.exports = { resizeImage: resizeImage, resizeMultipleImages: resizeAll };
