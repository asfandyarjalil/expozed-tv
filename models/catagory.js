const mongoose = require("mongoose");

const catagoriesSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  slug: {
    type: String,
    lowercase: true,
  },
  deleted: {
    type: Number,
    default: 0,
  },
  movies: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
    },
  ],
  music: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Music",
    },
  ],
  series: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
    },
  ],
  
},
{ timestamps: true }
);

const Catagory = mongoose.model("Category", catagoriesSchema);

module.exports = { Catagory };
