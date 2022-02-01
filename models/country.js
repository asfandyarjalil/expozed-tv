const mongoose = require("mongoose");

const countriesSchema = new mongoose.Schema({
  name: String,
  name:String,
});

const Country = mongoose.model("Country", countriesSchema);

module.exports = { Country };
