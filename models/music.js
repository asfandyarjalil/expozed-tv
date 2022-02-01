const mongoose = require ("mongoose");

const { ObjectId } = mongoose.Schema;

const musicSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    originalName: { type: String, default: "" },
    s_thumb: { type: String },
    catagory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    price: { type: Number, default: 5 },
    views: { type: Number, default: 0 },
    slug: {
        type: String,
        lowercase: true,
      },
      videoType:{type:String , default: "music"},
  imageUrl:{
      type:String,
  },
  videoUrl:{
      type:String,
  },
},
  { timestamps: true }
);
const Music = mongoose.model("Music", musicSchema);
module.exports= {Music};
