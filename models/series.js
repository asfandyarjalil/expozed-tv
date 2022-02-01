const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;
const episodeSchema = new mongoose.Schema(
    {
      originalName: { type: String, default: "" },
      name: { type: String, default: "" },
      description: { type: String, default: "" },
      s_thumb: { type: String },
    },
    { timestamps: true }
  );
  
  const seriesSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 320,
        required: true,
      },
      slug: {
        type: String,
        lowercase: true,
      },
      catagory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
      description: {
        type: {},
        minlength: 200,
        required: true,
      },
      price: { type: Number, default: 5 },
      views: { type: Number, default: 0 },
      s_thumb: { type: String },
      public: {
        type: Number,
        default: 0,
      },
      videoType:{type:String , default: "series"},
      episodes: [episodeSchema],
    },
    { timestamps: true }
  );

// const episodeSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       trim: true,
//       minlength: 3,
//       maxlength: 320,
//       required: true,
//     },
//     slug: {
//       type: String,
//       lowercase: true,
//     },
//     content: {
//       type: {},
//       minlength: 200,
//     },
//     video: {},
//     free_preview: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// const seriesSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       trim: true,
//       minlength: 3,
//       maxlength: 320,
//       required: true,
//     },
//     slug: {
//       type: String,
//       lowercase: true,
//     },
//     description: {
//       type: {},
//       minlength: 200,
//       required: true,
//     },
//     price: {
//       type: Number,
//       default: 9.99,
//     },
//     image: {},
//     category: String,
//     published: {
//       type: Boolean,
//       default: false,
//     },
//     paid: {
//       type: Boolean,
//       default: true,
//     },
//     // instructor: {
//     //   type: ObjectId,
//     //   ref: "User",
//     //   required: true,
//     // },
//     episodes: [episodeSchema],
//   },
//   { timestamps: true }
// );
const Series = mongoose.model("Series", seriesSchema);
module.exports= {Series};

