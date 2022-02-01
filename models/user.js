const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const saltRound = 10;
require("dotenv").config();

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please Provide your email"],
    unique: true,
    lowercase: true,
    unique: 1,
  },

  password: {
    type: String,
    required: [true, "PLease provide a password"],
    minlength: 8,
  },
  token: {
    type: String,
  },
  api_key: {
    type: String,
  },
  enabled: {
    type: Number,
    default: 1,
  },
  role: {
    type: Number,
    default: 0,
  },
  videos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Videos",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updateAt: {
    type: Date,
    default: Date.now,
  }
});

userSchema.pre("save", function (next) {
  var user = this;

  if (user.isModified("password")) {
    bcrypt.genSalt(saltRound, function (err, salt) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.methods.comparePassword = function (userPassword, cb) {
  bcrypt.compare(userPassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};
userSchema.methods.generateToken = function (cb) {
  var user = this;
  var token = jwt.sign(user._id.toHexString(), process.env.SECRET);

  user.token = token;
  user.save(function (err, user) {
    if (err) return cb(err);
    cb(null, user);
  });
};
userSchema.statics.findByToken = function (token, cb) {
  var user = this;

  jwt.verify(token, process.env.SECRET, function (err, decode) {
    user.findOne({ _id: decode, token: token }, function (err, user) {
      if (err) return cb(err);
      cb(null, user);
    });
  });
};

const User = mongoose.model("User", userSchema);

module.exports = { User };

// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   name: String,
//   email : String,
//   password : String
// });

// const User = mongoose.model("User", userSchema);

// module.exports = { User };
