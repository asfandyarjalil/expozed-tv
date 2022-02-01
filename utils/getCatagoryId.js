const { Catagory } = require("./../models/catagory");
function getCatagoryId(catagory, callback) {
  Catagory.find({ name: catagory }, (err, doc) => {
    if (!err) {
      result = doc.map((a) => a._id);
      result2 = result[0];

      console.log("Result2:  " + result2);
      callback(null, { catagoryId: result2 });
    } else {
      callback(err);
    }
  });
}

module.exports = { getCatagoryId: getCatagoryId };
