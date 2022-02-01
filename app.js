const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const exphbs = require('express-handlebars');
const path = require('path');
const multer = require('multer');
var nodeUuid = require('node-uuid');
var dateFormat = require('dateformat');
const async = require('async');
const uuidAPIKey = require('uuid-apikey');
var Handlebars = require('handlebars');
var paginate = require('handlebars-paginate');
const slugify = require('slugify');
const formidable = require('express-formidable');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
   accessKeyId: process.env.AWS_ID,
   secretAccessKey: process.env.AWS_SECRET,
});
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const { spawn, exec } = require('child_process');
const app = express();

const PORT = process.env.PORT || 8000;

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DATABASE, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   useFindAndModify: false,
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

const { User } = require('./models/user');
const { Catagory } = require('./models/catagory');

const { Movie } = require('./models/movies');
const { Series } = require('./models/series');
const { Music } = require('./models/music');

app.use(express.static('views'));
app.use('/', express.static('views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(express.static('public'));
app.use(express.static('uploads'));
app.use('/uploads', express.static('uploads'));
const hbs = exphbs.create({
   extname: 'handlebars',
   runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
   },
   layoutsDir: path.join(__dirname, '/views/layouts'),
   partialsDir: path.join(__dirname, 'views/partials'),
   defaultLayout: 'main',

   helpers: {
      getAllFranchise: function () {
         Franchise.find({}, (err, franchise) => {
            if (err) return err;
            return franchise;
         });
      },
      getCatagory: function () {
         Catagory.find({}, (err, catagory) => {
            if (err) return err;
            return catagory;
         });
      },
   },
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

Handlebars.registerHelper('paginate', paginate);

Handlebars.registerHelper('ifCond', function (v1, v2, options) {
   if (v1 === v2) {
      return options.fn(this);
   }
   return options.inverse(this);
});
//!========================================================================================================
//!
//!                    MIDDLEWARE
//!
//!========================================================================================================
const { auth } = require('./middleware/auth');
const { admin } = require('./middleware/admin');
const THUMB_EXT = '.jpg';
const VIDEO_EXT = '.mp4';

const { numberWithCommas } = require('./utils/numberWithCommas');
// const {
//   deleteReferenceWithProductID,
//   deleteReferenceWithTagID,
// } = require("./utils/deleteReference");
const {
   s3Delete,
   s3MultipleUpload,
   emptyBucket,
   uploadBgImage,
} = require('./utils/s3Browser');
const { resizeImage, resizeMultipleImages } = require('./utils/imageResizer');
const { s3Upload } = require('./utils/s3Upload');
const { USER_AGENT_SERIALIZED } = require('stripe');
const { getCatagoryId } = require('./utils/getCatagoryId');
const {
   updateCatagoryWhenUploadingMovie,
   updateCatagoryWhenUpdateMovieInfo,
   updateCatagoryWhenCreatingSeason,
   updateCatagoryWhenUpdateSeasonInfo,
   updateCatagoryWhenDeleteSeason,
   updateCatagoryWhenDeleteMovie,
   updateCatagoryWhenUploadingMusic,
   updateCatagoryWhenUpdateMusicInfo,
   updateCatagoryWhenDeleteMusic,
   updateVideosWhenDeleteCatagory,
} = require('./utils/updateCatagoryWhenUploadingVideo');
const {
   moviesThumbDeleteFroms3,
   musicThumbDeleteFroms3,
   videoDeleteFroms3,
   musicVideoDeleteFroms3,
   seriesThumbDeleteFroms3,
   episodesThumbDeleteFroms3,
} = require('./utils/logoDeleteFromS3');
const { randomWords } = require('./utils/randomWords');
const imageResizer = require('./utils/imageResizer');
//!================================================================
//!             HANDLEBARS
//!
//!================================================================
app.get('/catagories', auth, admin, (req, res) => {
   const { page, limit = 3 } = req.query;
   const currentPage = page || 1;

   var perPage = 10; // 3
   const searchKey = req.query.searchKey;
   //const reqExp = new RegExp(escapeRegex(name));
   const sortBy =
      req.query.sortBy == undefined ? 'createdAt' : req.query.sortBy;
   var sortObj = {};

   if (sortBy == 'createdAt' || sortBy == 'investment') {
      sortObj[sortBy] = '-1';
   } else {
      sortObj[sortBy] = '1';
   }

   console.log(sortObj);

   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
   }
   //{$or :[{name : { $regex: new RegExp(searchKey, "i") }} , { deleted: { $eq: null } }]}
   console.log();
   Promise.all([
      Catagory.find({ $and: [nameObj, { deleted: { $eq: 0 } }] })
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),

      Catagory.countDocuments({}),
   ]).then(([franchise, length]) => {
      var result = JSON.parse(JSON.stringify(franchise));
      var lengthOfObject = JSON.parse(JSON.stringify(length));
      console.log(result);
      for (var i in franchise) {
         result[i].createdAt = dateFormat(
            result[i].createdAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         result[i].updateAt = dateFormat(
            result[i].updateAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
      }

      ///sdkj;skj;j;
      res.render('catagories', {
         style: 'style',
         bootstrap: 'bootstrap',
         pnotify: 'pnotify',
         responsive: 'responsive',
         jquery: 'jquery',
         ppnotify: 'pnotify',
         paginate: 'paginate',
         title: 'Franchise Search Engine',
         data: result,
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfObject / perPage, // The total number of available pages total/perpage
         },
         // interestCount:countInterestInFranchise
         //data3: getAllFranchise,
      });
   });
});
app.get('/archived', auth, admin, (req, res) => {
   const { page } = req.query;
   const currentPage = page || 1;

   var perPage = 10; // 3
   const searchKey = req.query.searchKey;
   //const reqExp = new RegExp(escapeRegex(name));
   const sortBy =
      req.query.sortBy == undefined ? 'createdAt' : req.query.sortBy;
   var sortObj = {};

   if (sortBy == 'createdAt' || sortBy == 'investment') {
      sortObj[sortBy] = '-1';
   } else {
      sortObj[sortBy] = '1';
   }

   console.log(sortObj);

   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
   }
   //{$or :[{name : { $regex: new RegExp(searchKey, "i") }} , { deleted: { $eq: null } }]}
   console.log();
   Promise.all([
      Catagory.find({
         $and: [nameObj, { deleted: { $eq: 1 } }],
      })
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),

      Catagory.count({ deleted: { $eq: 1 } }),
   ]).then(([franchise, length]) => {
      var result = JSON.parse(JSON.stringify(franchise));
      var lengthOfObject = JSON.parse(JSON.stringify(length));
      console.log(result);

      // for (var i in franchise) {
      //   result[i].investment = numberWithCommas(result[i].investment);
      //   result[i]["logoURL"] =
      //     process.env.CDN_DISTRIBUTION_URL +
      //     result[i]._id +
      //     "/" +
      //     result[i].logoName +
      //     "_thumb" +
      //     result[i].logoExt;
      // }
      res.render('archived', {
         paginate: 'paginate',
         data: result,
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfObject / perPage, // The total number of available pages total/perpage
         },
      });
   });
});
app.get('/', auth, admin, (req, res) => {
   return res.redirect('/movies');
});
app.get('/editUser', auth, admin, (req, res) => {
   var userID = req.query.id;
   if (userID && mongoose.Types.ObjectId.isValid(userID)) {
      Promise.all([User.findById({ _id: userID })]).then(([user, country]) => {
         var userData = JSON.parse(JSON.stringify(user));

         res.render('edit-user', {
            user: userData,
         });
      });
   } else {
      res.render('404-notFound');
   }
});
app.get('/settings', auth, admin, async (req, res) => {
   let token = req.cookies.w_auth;

   await User.findByToken(token, (err, user) => {
      if (err) throw err;
      var adminData = JSON.parse(JSON.stringify(user));
      adminData['bgURL'] = process.env.CDN_DISTRIBUTION_URL + 'bg.jpg';

      res.render('settings', {
         admin: adminData,
      });
   });
});
app.get('/index', auth, (req, res) => {
   res.render('index', {});
});
app.get('/login', (req, res) => {
   res.render('login', {
      style: 'style',
      bootstrap: 'bootstrap',
      pnotify: 'pnotify',
      responsive: 'responsive',
      jquery: 'jquery',
      ppnotify: 'pnotify',
   });
});
app.get('/forgotPassword', (req, res) => {
   res.render('forgot-password', {});
});
app.get('/users', auth, admin, (req, res) => {
   const { page } = req.query;
   const currentPage = page || 1;
   var perPage = 10;
   const searchKey = req.query.searchKey;
   const sortBy = req.query.sortBy == undefined ? 'name' : req.query.sortBy;
   var sortObj = {};
   sortObj[sortBy] = '1';
   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.email = { $regex: new RegExp(searchKey, 'i') };
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
      nameObj.lastname = { $regex: new RegExp(searchKey, 'i') };
   }
   console.log(nameObj);
   Promise.all([
      User.find({
         $or: [
            { name: { $regex: new RegExp(searchKey, 'i') } },
            { email: { $regex: new RegExp(searchKey, 'i') } },
            { lastname: { $regex: new RegExp(searchKey, 'i') } },
         ],
      })
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),
      User.countDocuments({}),
   ]).then(([user, length]) => {
      var userData = JSON.parse(JSON.stringify(user));
      var lengthOfUserObj = JSON.parse(JSON.stringify(length));
      for (var i in user) {
         userData[i].createdAt = dateFormat(
            userData[i].createdAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         userData[i].updateAt = dateFormat(
            userData[i].updateAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
      }

      res.render('users', {
         data: userData,
         paginate: 'paginate',
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfUserObj / perPage, // The total number of available pages total/perpage
         },
      });
   });
});
app.get('/movies', auth, admin, (req, res) => {
   const { page, limit = 3 } = req.query;
   const currentPage = page || 1;
   var perPage = 7; // 3
   const searchKey = req.query.searchKey;
   const sortBy =
      req.query.sortBy == undefined ? 'createdAt' : req.query.sortBy;
   var sortObj = {};
   if (sortBy == 'createdAt') {
      sortObj[sortBy] = '-1';
   } else {
      sortObj[sortBy] = '1';
   }
   console.log(sortObj);
   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
   }
   Promise.all([
      Movie.find({
         $or: [{ originalName: { $regex: new RegExp(searchKey, 'i') } }],
      })
         .populate('catagory', 'name')
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),
      Movie.countDocuments({}),
   ]).then(([videos, length]) => {
      var video = JSON.parse(JSON.stringify(videos));
      var lengthOfObject = JSON.parse(JSON.stringify(length));

      for (var i in videos) {
         //console.log(video[i].name);
         video[i].createdAt = dateFormat(
            video[i].createdAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         video[i].updatedAt = dateFormat(
            video[i].updatedAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         video[i]['videoURL'] =
            'https://assets.mixkit.co/videos/preview/mixkit-a-herd-of-lions-walking-11054-large.mp4';

         // process.env.CDN_DISTRIBUTION_URL +
         //   video[i]._id +
         //   "/" +
         //   video[i].name +
         //   VIDEO_EXT;
         video[i][
            'thumbnailURL'
         ] = `${process.env.CDN_DISTRIBUTION_URL}${video[i]._id}/${video[i].s_thumb}`;
         // process.env.CDN_DISTRIBUTION_URL +
         // video[i]._id +
         // "/" +
         // video[i].s_thumb ;
      }
      // console.log(video);
      res.render('movies', {
         data: video,
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfObject / perPage, // The total number of available pages total/perpage
         },
      });
   });
});

app.get('/editVideo', auth, admin, (req, res) => {
   var videoID = req.query.id;
   if (videoID && mongoose.Types.ObjectId.isValid(videoID)) {
      Promise.all([
         Movie.findById({ _id: videoID }).populate('catagory', 'name'),
         Catagory.find({ $and: [{ deleted: { $eq: 0 } }] }),
      ]).then(([video, catagories]) => {
         var videoData = JSON.parse(JSON.stringify(video));
         var allCatagories = JSON.parse(JSON.stringify(catagories));
         //console.log(allCatagories);
         console.log(videoData.catagory);

         if (videoData.catagory !== undefined) {
            allCatagories = allCatagories.map(function (el) {
               var o = Object.assign({}, el);

               o.selected = 'false';
               if (o.name === videoData.catagory.name) {
                  o.selected = 'true';
               }
               return o;
            });
         }

         videoData['logoURL'] =
            process.env.CDN_DISTRIBUTION_URL +
            videoID +
            '/' +
            videoData.s_thumb;
         var result = [];
         if (videoData.name) {
            result['title'] = videoData.originalName;
            result['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               videoData.s_thumb;
            result['videoURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               videoData.name;
         }
         res.render('add-movie', {
            catagory: allCatagories,
            franchise: videoData,
            video: result,
         });
      });
   } else {
      res.render('404-notFound');
   }
});
app.get('/addDetail', auth, admin, (req, res) => {
   Promise.all([Catagory.find({ $and: [{ deleted: { $eq: 0 } }] })]).then(
      ([catagory]) => {
         var allCatagories = JSON.parse(JSON.stringify(catagory));

         res.render('add-movie', {
            catagory: allCatagories,
         });
      },
   );
});
app.get('/music', auth, admin, (req, res) => {
   const { page, limit = 3 } = req.query;
   const currentPage = page || 1;
   var perPage = 7; // 3
   const searchKey = req.query.searchKey;
   const sortBy =
      req.query.sortBy == undefined ? 'createdAt' : req.query.sortBy;
   var sortObj = {};
   if (sortBy == 'createdAt') {
      sortObj[sortBy] = '-1';
   } else {
      sortObj[sortBy] = '1';
   }
   console.log(sortObj);
   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
   }
   Promise.all([
      Music.find({
         $or: [{ originalName: { $regex: new RegExp(searchKey, 'i') } }],
      })
         .populate('catagory')
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),
      Music.countDocuments({}),
   ]).then(([videos, length]) => {
      var video = JSON.parse(JSON.stringify(videos));
      var lengthOfObject = JSON.parse(JSON.stringify(length));

      for (var i in videos) {
         //console.log(video[i].name);
         video[i].uploadedAt = dateFormat(
            video[i].updatedAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         video[i]['videoURL'] =
            'https://assets.mixkit.co/videos/preview/mixkit-a-herd-of-lions-walking-11054-large.mp4';

         // process.env.CDN_DISTRIBUTION_URL +
         //   video[i]._id +
         //   "/" +
         //   video[i].name +
         //   VIDEO_EXT;
         video[i][
            'thumbnailURL'
         ] = `${process.env.CDN_DISTRIBUTION_URL}${video[i]._id}/${video[i].s_thumb}`;
         // process.env.CDN_DISTRIBUTION_URL +
         // video[i]._id +
         // "/" +
         // video[i].s_thumb ;
      }
      // console.log(video);
      res.render('music', {
         data: video,
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfObject / perPage, // The total number of available pages total/perpage
         },
      });
   });
});
app.get('/addMusic', auth, admin, (req, res) => {
   Promise.all([Catagory.find({ $and: [{ deleted: { $eq: 0 } }] })]).then(
      ([catagory]) => {
         var allCatagories = JSON.parse(JSON.stringify(catagory));

         res.render('add-music', {
            catagory: allCatagories,
         });
      },
   );
});
app.get('/editMusic', auth, admin, (req, res) => {
   var videoID = req.query.id;
   if (videoID && mongoose.Types.ObjectId.isValid(videoID)) {
      Promise.all([
         Music.findById({ _id: videoID }).populate('catagory', 'name'),
         Catagory.find({ $and: [{ deleted: { $eq: 0 } }] }),
      ]).then(([video, catagories]) => {
         var videoData = JSON.parse(JSON.stringify(video));
         var allCatagories = JSON.parse(JSON.stringify(catagories));
         console.log(allCatagories);
         //console.log(videoData);

         if (videoData.catagory !== undefined) {
            allCatagories = allCatagories.map(function (el) {
               var o = Object.assign({}, el);

               o.selected = 'false';
               if (o.name === videoData.catagory.name) {
                  o.selected = 'true';
               }
               return o;
            });
         }

         videoData['logoURL'] =
            process.env.CDN_DISTRIBUTION_URL +
            videoID +
            '/' +
            videoData.s_thumb;
         var result = [];
         if (videoData.name) {
            result['title'] = videoData.originalName;
            result['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               videoData.s_thumb;
            result['videoURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               videoData.name;
         }
         res.render('add-music', {
            catagory: allCatagories,
            franchise: videoData,
            video: result,
         });
      });
   } else {
      res.render('404-notFound');
   }
});
app.get('/series', auth, admin, (req, res) => {
   const { page, limit = 3 } = req.query;
   const currentPage = page || 1;
   var perPage = 7; // 3
   const searchKey = req.query.searchKey;
   const sortBy =
      req.query.sortBy == undefined ? 'createdAt' : req.query.sortBy;
   var sortObj = {};
   if (sortBy == 'createdAt') {
      sortObj[sortBy] = '-1';
   } else {
      sortObj[sortBy] = '1';
   }
   // console.log(sortObj);
   var nameObj = {};
   if (searchKey != undefined) {
      nameObj.name = { $regex: new RegExp(searchKey, 'i') };
   }
   Promise.all([
      Series.find({
         $or: [{ name: { $regex: new RegExp(searchKey, 'i') } }],
      })
         .populate('catagory', 'name')
         .sort(sortObj)
         .skip((currentPage - 1) * perPage)
         .limit(perPage),
      Series.countDocuments({}),
   ]).then(([videos, length]) => {
      var video = JSON.parse(JSON.stringify(videos));
      var lengthOfObject = JSON.parse(JSON.stringify(length));

      for (var i in videos) {
         //console.log(video[i].name);
         videos[i].createdAt = dateFormat(
            video[i].createdAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         videos[i].updatedAt = dateFormat(
            video[i].updatedAt,
            'd mmmm, yyyy h:MM:ss TT',
         );
         videos[i]['thumbnailURL'] =
            process.env.CDN_DISTRIBUTION_URL +
            video[i]._id +
            '/' +
            video[i].s_thumb;
         // console.log(videos[i].thumbnailURL);
      }
      console.log(videos.thumbnailURL);
      res.render('series', {
         data: videos,
         pagination: {
            page: currentPage, // The current page the user is on
            pageCount: lengthOfObject / perPage, // The total number of available pages total/perpage
         },
      });
   });
});
app.get('/editSeason', auth, admin, (req, res) => {
   var videoID = req.query.id;
   if (videoID && mongoose.Types.ObjectId.isValid(videoID)) {
      Promise.all([
         Series.findById({ _id: videoID }).populate('catagory', 'name'),
         Catagory.find({ $and: [{ deleted: { $eq: 0 } }] }),
      ]).then(([series, catagories]) => {
         var seriesData = JSON.parse(JSON.stringify(series));
         var allCatagories = JSON.parse(JSON.stringify(catagories));
         var videoData = JSON.parse(JSON.stringify(seriesData.episodes));

         seriesData['logoURL'] =
            process.env.CDN_DISTRIBUTION_URL +
            seriesData._id +
            '/' +
            seriesData.s_thumb;
         if (seriesData.catagory !== undefined) {
            allCatagories = allCatagories.map(function (el) {
               var o = Object.assign({}, el);

               o.selected = 'false';
               if (o.name === seriesData.catagory.name) {
                  o.selected = 'true';
               }
               return o;
            });
         }

         videoData['logoURL'] =
            process.env.CDN_DISTRIBUTION_URL +
            videoID +
            '/' +
            videoData.s_thumb;
         var result = [];
         for (var i in videoData) {
            videoData[i]['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               seriesData._id +
               '/' +
               videoData[i].s_thumb;
            videoData[i]['videoUrl'] =
               process.env.CDN_DISTRIBUTION_URL +
               seriesData._id +
               '/' +
               videoData[i].name +
               VIDEO_EXT;
         }
         console.log(videoData);

         res.render('add-series', {
            catagory: allCatagories,
            franchise: seriesData,
            videos: videoData,
         });
      });
   } else {
      res.render('404-notFound');
   }
});

app.get('/addSeason', auth, admin, (req, res) => {
   Promise.all([Catagory.find({ $and: [{ deleted: { $eq: 0 } }] })]).then(
      ([catagory]) => {
         var allCatagories = JSON.parse(JSON.stringify(catagory));

         res.render('add-series', {
            catagory: allCatagories,
         });
      },
   );
});
app.get('/editEpisode', auth, admin, async (req, res) => {
   var videoID = req.query.id;
   var result = {};
   if (videoID && mongoose.Types.ObjectId.isValid(videoID)) {
      const seasonEpisode = await Series.find(
         { 'episodes._id': req.query.id },
         { episodes: { $elemMatch: { _id: req.query.id } } },
      );
      console.log(seasonEpisode);
      result.seasonId = seasonEpisode[0]._id;
      result.thumbnailURL = `${process.env.CDN_DISTRIBUTION_URL}${result.seasonId}/${seasonEpisode[0].episodes[0].s_thumb}`;
      result.name = seasonEpisode[0].episodes[0].originalName;
      result.description = seasonEpisode[0].episodes[0].description;
      console.log(result);

      res.render('edit-episode', {
         episode: result,
      });
   } else {
      res.render('404-notFound');
   }
});
//!========================================================================================================
//!
//!                    USER
//!
//!========================================================================================================
app.post('/api/v1/register', (req, res) => {
   //! User Signup
   //! An unique Api key will be assigned to a user automatically during signup process
   //! using uuid-apikey for Api-Key
   const email = req.body.email;
   const apiKey = uuidAPIKey.create();
   // console.log(apiKey.apiKey);
   if (!validator.isEmail(email)) {
      return res.json({
         success: false,
         message: 'Please Provide a valid Email',
      });
   }
   if (validator.isEmail(email)) {
      User.findOne({ email: email }, (err, user) => {
         if (user) {
            res.json({ success: false, message: 'You are already Registered' });
         } else {
            const user = new User(req.body);
            user.api_key = apiKey.apiKey; //! assigning an api-key to a user
            user.save((err, doc) => {
               if (err) return res.json({ success: false, err });
               console.log(err);
               res.status(200).json({
                  success: true,
                  message: 'Your now Registered',
               });
            });
         }
      });
   }
});
app.post('/api/v1/login', (req, res) => {
   //! User login
   const email = req.body.email;
   User.findOne({ $and: [{ email: email }] }, (err, user) => {
      if (!user)
         return res.json({
            loginSuccess: false,
            message: 'Auth failed, email not found',
         });
      if (user.enabled == 0) {
         return res.json({
            loginSuccess: false,
            message:
               'Your account is disabled please contact your administrative',
         });
      }
      console.log(user.enabled);

      user.comparePassword(req.body.password, (err, isMatch) => {
         if (!isMatch)
            return res.json({
               loginSuccess: false,
               message: 'Invalid Username and password',
            });
         user.generateToken((err, user) => {
            if (err) return res.status(400).send(err);

            res.cookie('w_auth', user.token).status(200).json({
               loginSuccess: true,
               message: 'You are now Logged in',
               user: user,
            });
         });
         // jwt.sign({user}, process.env.SECRET, (err, token) => {
         //   res.json({
         //     token,
         //     loginSuccess: true,
         //   message: "You are now Logged in",
         //   user: user,
         //   });
         // });
      });
   });
});
app.get('/api/v1/logout', auth, admin, (req, res) => {
   //console.log(req.user);
   User.findOneAndUpdate({ _id: req.user._id }, { token: '' }, (err, doc) => {
      if (err) return res.json({ success: false, err });
      console.log('You are now logout');
      res.status(200).redirect('/login');
      //res.status(200).redirect("/login");
   });
});
app.post('/api/v1/updateProfile', auth, admin, (req, res) => {
   console.log('elloo');
   const userID = req.query.id;
   const name = req.body.name;
   // const lastname = req.body.lastname;
   const email = req.body.email;
   const password = req.body.password;
   // const phone = req.body.phone;
   // const city = req.body.city;
   // const state = req.body.state;
   // const country = req.body.country;
   const role = req.body.role;
   var obj = {};
   if (name) {
      obj.name = name;
   }
   // if (lastname) {
   //   obj.lastname = lastname;
   // }
   if (email) {
      obj.email = email;
   }
   if (password) {
      const hash = bcrypt.hashSync(password, 10);
      obj.password = hash;
      console.log(obj.password);
   }
   // if (phone) {
   //   obj.phone = phone;
   // }
   // if (city) {
   //   obj.city = city;
   // }
   // if (state) {
   //   obj.state = state;
   // }
   // if (country) {
   //   obj.country = country;
   // }
   if (role) {
      obj.role = role;
   }
   obj.updateAt = new Date();
   User.findOneAndUpdate(
      {
         _id: userID,
      },
      {
         $set: obj,
      },

      (err, doc) => {
         if (err) return res.json({ success: false, err });
         console.log(err);
         return res.status(200).send({
            success: true,
            message: 'Your Profile is Updated',
         });
      },
   );
});
app.post('/api/v1/toggleStatus', auth, admin, (req, res) => {
   const userID = req.body.userId;
   User.findOneAndUpdate(
      { _id: userID },
      { $set: { enabled: req.body.enabled } },
      // (err, doc) => {
      //   if (!err) console.log("Franchise updated successfully" + doc._id);
      // }
   )
      .then((result) => {
         console.log('Useer toggle is updated');
         var msg;

         if (req.body.enabled == 1) {
            msg = 'Account is enabled Now';
         } else {
            msg = 'Account is disabled Now';
         }
         res.status(200).json({ success: true, message: msg });
      })
      .catch((err) => {
         console.log(err);
      });
});
app.post('/api/v1/updateAdmin', auth, admin, (req, res) => {
   let token = req.cookies.w_auth;
   const name = req.body.name;
   const email = req.body.email;
   var password = req.body.password;
   var newPassword = req.body.newPassword;
   var obj = {};
   if (name) {
      obj.name = name;
   }
   if (email) {
      obj.email = email;
   }
   // console.log(confirmPassword);
   User.findByToken(token, (err, user) => {
      if (err) throw err;

      const userID = user._id;
      console.log(userID);
      if (password) {
         user.comparePassword(password, (err, isMatch) => {
            if (!isMatch)
               return res.json({
                  login: false,
                  message: 'Current password you entered is incorrect',
               });
            if (newPassword) {
               const hash = bcrypt.hashSync(newPassword, 10);
               obj.password = hash;
               console.log(obj.password);
            }
            User.findByIdAndUpdate(
               { _id: userID },
               { $set: obj },
               { new: true },
               (err, updatedUser) => {
                  if (err)
                     res.status(400).json({
                        success: false,
                        message: err,
                     });
                  res.status(200).json({
                     success: true,
                     message: 'Your profile is updated',
                  });
               },
            );
         });
      } else {
         User.findByIdAndUpdate(
            { _id: userID },
            { $set: obj },
            { new: true },
            (err, updatedUser) => {
               if (err)
                  res.status(400).json({
                     success: false,
                     message: err,
                  });
               res.status(200).json({
                  success: true,
                  message: 'Your profile is updated',
               });
            },
         );
      }
   });
});
app.post('/api/v1/forgotPassword', (req, res) => {
   const email = req.body.email;
   if (validator.isEmail(email)) {
      User.findOne({ email: email }, (err, user) => {
         if (!user) {
            return res.status(400).json({
               success: false,
               message: 'User with email does not exit',
            });
         }
         var password = randomWords();
         console.log(password);
         var hash = bcrypt.hashSync(password, 10);
         console.log(hash);
         User.findOneAndUpdate(
            { email: email },
            { $set: { password: hash } },
            { new: true },
            (err, doc) => {
               if (err) res.status(400).json({ success: false, message: err });
               forgotPassword(email, password);
               res.status(200).json({
                  success: true,
                  message: 'Password is send to your email',
               });
            },
         );
      });
   } else {
      res.status(400).json({
         success: false,
         message: 'PLease provide a valid email address',
      });
   }
});

//!========================================================================================================
//!
//!                    Catagory
//!
//!========================================================================================================

app.post('/api/v1/roku', auth, admin, (req, res) => {
   //console.log(req.user);
   const rokuapp = new Roku_APP(req.body);
   // product.user = req.user._id;
   rokuapp.save((err, email) => {
      if (err) return res.json({ success: false, err });
      res.status(200).json({
         success: true,
         rokuapp: email,
      });
   });
});

app.post('/api/v1/app_bg', auth, admin, (req, res) => {
   var localImagePath = 'uploads/';
   var localImageName = '';
   var mySeriesFunction = [];
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         const fs = require('fs');
         if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync('uploads/', { recursive: true });
         }
         cb(null, 'uploads/');
      },
      filename: function (req, file, cb) {
         ext = path.extname(file.originalname);
         localImageName = 'bg.jpg';
         cb(null, localImageName);
      },
   });
   console.log(localImageName);
   var upload = multer({ dest: localImagePath, storage: storage }).single(
      'userFile',
   );
   upload(req, res, function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }

      console.log('upload Complete....');
      var contentType = 'image/jpeg';
      var allGeneratedImages = [];
      allGeneratedImages.push({
         localFileKey: localImagePath + '/' + localImageName,
         remoteFileKey: localImageName,
         contentType: contentType,
         cacheControl: 'max-age=2',
      });

      // mySeriesFunction.push(async.apply(resizeMultipleImages, resizeRequest));
      mySeriesFunction.push(async.apply(s3MultipleUpload, allGeneratedImages));

      async.series(mySeriesFunction, function (err, result) {
         console.log(result);

         var response = {
            name: localImageName,
            logoPathOriginal: process.env.CDN_DISTRIBUTION_URL + localImageName,
            message: 'File is Uploaded',
            success: true,
         };
         res.status(200).send(response);
      });
   });
});

///===============================================================================================////
///=================================== Create=====================================================////
///===============================================================================================////
app.post('/api/v1/video', auth, admin, async (req, res) => {
   const originalName = req.body.name;
   const description = req.body.description;
   const price = req.body.price;
   const public = req.body.public;
   const catagory = req.body.catagory;
   var obj = {};
   if (originalName) {
      obj.originalName = originalName;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId[0]._id);
      obj.catagory = catagoryId[0]._id;
   }
   try {
      const movie = await new Movie(obj).save();
      updateCatagoryWhenUploadingMovie(catagory, movie._id);
      res.status(200).json({
         success: true,
         movie: movie,
      });
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Movie create failed. Try again.' });
   }
});
app.post('/api/v1/musicVideo', auth, admin, async (req, res) => {
   const originalName = req.body.name;
   const description = req.body.description;
   const price = req.body.price;
   const public = req.body.public;
   const catagory = req.body.catagory;
   var obj = {};
   if (originalName) {
      obj.originalName = originalName;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId[0]._id);
      obj.catagory = catagoryId[0]._id;
   }
   try {
      const music = await new Music(obj).save();
      updateCatagoryWhenUploadingMusic(catagory, music._id);
      res.status(200).json({
         success: true,
         music: music,
      });
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Movie create failed. Try again.' });
   }
});
app.post('/api/v1/season', auth, admin, async (req, res) => {
   const name = req.body.name;
   const description = req.body.description;
   const price = req.body.price;
   const public = req.body.public;
   const catagory = req.body.catagory;
   var obj = {};
   if (name) {
      obj.name = name;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId[0]._id);
      obj.catagory = catagoryId[0]._id;
   }
   try {
      const series = await new Series(obj).save();
      updateCatagoryWhenCreatingSeason(catagory, series._id);
      res.status(200).json({
         success: true,
         series: series,
      });
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Season create failed. Try again.' });
   }
});
app.post('/api/v1/catagory', async (req, res) => {
   try {
      const alreadyExit = await Catagory.findOne({
         slug: slugify(req.body.name.toLowerCase()),
      });
      if (alreadyExit)
         return res
            .status(400)
            .json({ success: false, message: 'Name is Taken' });

      const catagory = await new Catagory({
         slug: slugify(req.body.name),
         ...req.body,
      }).save();
      res.json({ success: true, catagory });
   } catch (err) {
      console.log(err);
      return res.status(400).json({
         success: false,
         message: 'Category create failed. Try again.',
      });
   }
});

///===============================================================================================////
///=================================== Delete=====================================================////
///===============================================================================================////
app.post('/api/v1/deleteEpisode', auth, admin, (req, res) => {
   const seriesId = req.body._id;
   // var s3_path_key = id + "/";
   var episodeId = req.body.videoId;
   Promise.all([
      Series.find(
         { 'episodes._id': episodeId },
         { episodes: { $elemMatch: { _id: episodeId } } },
      ),
      Series.findOneAndUpdate(
         { _id: seriesId },
         { $pull: { episodes: { _id: episodeId } } },
      ),
   ]).then(([seriesInfo, videoDelte]) => {
      var result = {};
      result.seasonId = seriesInfo[0]._id;
      // result.s_thumb= seriesInfo[0].episodes[0].name;
      result.episodeAddress = `${result.seasonId}/${seriesInfo[0].episodes[0].name}${VIDEO_EXT}`;
      result.thumbAddress = `${result.seasonId}/${seriesInfo[0].episodes[0].s_thumb}`;
      s3Delete(result.episodeAddress);
      s3Delete(result.thumbAddress);
      // emptyBucket(s3Key);
      res.send('Deleted');
   });
});
app.post('/api/v1/deleteSeason', auth, admin, (req, res) => {
   const seriesId = req.body.id;
   const s3Key = seriesId;
   Promise.all([Series.findOneAndDelete({ _id: seriesId })]).then(
      ([seriesInfo]) => {
         emptyBucket(s3Key);
         updateCatagoryWhenDeleteSeason(seriesId);
         res.status(200).json({
            success: true,
            message: 'Your Series is deleted permenantly',
         });
      },
   );
});
app.post('/api/v1/deleteMusic', auth, admin, (req, res) => {
   const musicId = req.body.id;
   const s3Key = musicId;
   Promise.all([Music.findOneAndDelete({ _id: musicId })]).then(
      ([seriesInfo]) => {
         emptyBucket(s3Key);
         updateCatagoryWhenDeleteMusic(musicId);
         res.status(200).json({
            success: true,
            message: 'Your Movie is deleted permenantly',
         });
      },
   );
});
app.post('/api/v1/deleteMovie', auth, admin, (req, res) => {
   const movieId = req.body.id;
   const s3Key = movieId;
   Promise.all([Movie.findOneAndDelete({ _id: movieId })]).then(
      ([seriesInfo]) => {
         emptyBucket(s3Key);
         updateCatagoryWhenDeleteMovie(movieId);
         res.status(200).json({
            success: true,
            message: 'Your Movie is deleted permenantly',
         });
      },
   );
});
app.post('/api/v1/deleteCatagoryPrimarly', auth, admin, (req, res) => {
   const catagoryID = req.query.id;
   Catagory.findByIdAndUpdate(
      { _id: catagoryID },
      { $set: { deleted: 1 } },
      (err, catagory) => {
         if (err) return res.status(400).json({ success: false, err });
         res.status(200).json({
            success: true,
            message: 'Catagory is primarly deleted',
         });
      },
   );
});
app.post('/api/v1/restoreCatagory', auth, admin, (req, res) => {
   const catagoryID = req.body.id;
   Catagory.findByIdAndUpdate(
      { _id: catagoryID },
      { $set: { deleted: 0 } },
      { new: true },
      (err, doc) => {
         if (err)
            return res.status(400).json({
               success: false,
               message: err,
            });
         res.status(200).json({
            success: true,
            message: 'Your Catagory is restored',
         });
      },
   );
});
app.post('/api/v1/deleteCatagoryPermenant', auth, admin, (req, res) => {
   const catagoryId = req.body.id;
   console.log(catagoryId);
   //const s3Key = franchiseId +"/

   Promise.all([Catagory.findByIdAndDelete({ _id: catagoryId })]).then(
      ([catagory]) => {
         console.log(catagory);

         updateVideosWhenDeleteCatagory(catagoryId);
         res.status(200).json({
            success: true,
            message: 'Your Catagory is deleted permenantly',
         });
      },
   );
});

///===============================================================================================////
///===================================Uploading Thumbnails=======================================////
///===============================================================================================////
app.post('/api/v1/uploadEpisode', auth, admin, async (req, res) => {
   let videoID = req.query.id;
   var ext = '.mp4';
   var localVideoPath = '';
   var localVideoName = '';
   var localVideoNameNoExt = '';
   var originalName = '';
   var mySeriesFunction = [];
   var VIDEO_EXT = '.mp4';
   const CHUNK_SIZE = 10000000; // 10MB
   const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
   });
   var s3_path_key = videoID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         localVideoPath = 'uploads/';
         const fs = require('fs'); // Or `import fs from "fs";` with ESM
         if (!fs.existsSync(localVideoPath)) {
            fs.mkdirSync(localVideoPath, { recursive: true });
         }
         cb(null, localVideoPath);
      },
      filename: function (req, file, cb) {
         localVideoNameNoExt = nodeUuid.v4();
         originalName = file.originalname;
         //ext = path.extname(file.originalname);
         originalName = originalName.split('.').slice(0, -1).join('.');
         console.log(ext);
         console.log(originalName);
         localVideoName = localVideoNameNoExt + VIDEO_EXT;
         console.log(localVideoName);
         cb(null, localVideoName);
      },
   });
   var upload = multer({ storage: storage }).single('userFile');
   upload(req, res, function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      var vidContentType = 'video/' + ext.replace('.', '');
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(req.file.path, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${localVideoName}`,
         ContentType: vidContentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            fs.unlinkSync(req.file.path); // Empty temp folder
            const updated = await Series.findOneAndUpdate(
               { _id: videoID },
               {
                  $push: {
                     episodes: { originalName, name: localVideoNameNoExt },
                  },
               },
               { new: true },
            ).exec();
            // updated.episodes["videoUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + VIDEO_EXT;
            // updated.episodes["imageUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + THUMB_EXT;
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            responce['originalName'] = originalName;
            responce['videoURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               localVideoNameNoExt +
               VIDEO_EXT;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               updated.localVideoNameNoExt +
               THUMB_EXT;
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/seasonLogo', auth, admin, async (req, res) => {
   var seasonID = req.query.id;
   var localImageName = '';
   var localImageNameNoExt = '';
   const CHUNK_SIZE = 10000000; // 10MB

   var logoName = '';
   const img = 'image/png';
   var ext = '';
   var localImagePath = 'thumbnails/';
   var s3_path_key = seasonID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         const fs = require('fs');
         if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync('thumbnails/', { recursive: true });
         }
         cb(null, 'thumbnails/');
      },
      filename: function (req, file, cb) {
         localImageNameNoExt = nodeUuid.v4();
         ext = path.extname(file.originalname);
         localImageName = localImageNameNoExt + THUMB_EXT;
         cb(null, localImageName); // .replace(/ /g, '_' )
      },
   });

   // console.log(localImageNameNoExt);
   var upload = multer({ storage: storage }).single('userFile');
   // const outputFilePath = "thumbnails/";

   upload(req, res, async function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      console.log(req.file);
      var outputFilePath = `uploads/${req.file.filename}`;
      var bgOutputPath = `uploads/bg_${req.file.filename}`;
      var contentType = 'image/' + ext.replace('.', '');
      const imageResize = await sharp(req.file.path)
         .resize(259, 351)
         .toFile(outputFilePath);
      const bgImageResize = await sharp(req.file.path)
         .resize(909, 513)
         .toFile(bgOutputPath);
      fs.unlinkSync(req.file.path);
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(outputFilePath, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${req.file.filename}`,
         ContentType: contentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            seriesThumbDeleteFroms3(seasonID);
            fs.unlinkSync(outputFilePath); // Empty temp folder
            const updated = await Series.findOneAndUpdate(
               { _id: seasonID },
               {
                  s_thumb: req.file.filename,
               },
               { new: true },
            ).exec();
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            // responce["originalName"] = originalName;
            // responce["videoURL"] =
            //   process.env.CDN_DISTRIBUTION_URL +
            //   videoID +
            //   "/" +
            //   localVideoNameNoExt +
            //   VIDEO_EXT;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               seasonID +
               '/' +
               updated.s_thumb;
            uploadBgImage(
               process.env.AWS_BUCKET_NAME,
               bgOutputPath,
               s3_path_key,
               req.file.filename,
               contentType,
            );
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/movielogo', auth, admin, async (req, res) => {
   var movieID = req.query.id;
   var localImageName = '';
   var localImageNameNoExt = '';
   const CHUNK_SIZE = 10000000; // 10MB

   var logoName = '';
   const img = 'image/png';
   var ext = '';
   var localImagePath = 'thumbnails/';
   var s3_path_key = movieID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         const fs = require('fs');
         if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync('thumbnails/', { recursive: true });
         }
         cb(null, 'thumbnails/');
      },
      filename: function (req, file, cb) {
         localImageNameNoExt = nodeUuid.v4();
         ext = path.extname(file.originalname);
         localImageName = localImageNameNoExt + THUMB_EXT;
         cb(null, localImageName); // .replace(/ /g, '_' )
      },
   });

   // console.log(localImageNameNoExt);
   var upload = multer({ storage: storage }).single('userFile');
   // const outputFilePath = "thumbnails/";

   upload(req, res, async function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      console.log(req.file);
      var outputFilePath = `uploads/${req.file.filename}`;
      var bgOutputPath = `uploads/bg_${req.file.filename}`;
      var contentType = 'image/' + ext.replace('.', '');
      const imageResize = await sharp(req.file.path)
         .resize(259, 351)
         .toFile(outputFilePath);
      const bgImageResize = await sharp(req.file.path)
         .resize(909, 513)
         .toFile(bgOutputPath);
      fs.unlinkSync(req.file.path);

      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(outputFilePath, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${req.file.filename}`,
         ContentType: contentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            moviesThumbDeleteFroms3(movieID);
            fs.unlinkSync(outputFilePath); // Empty temp folder
            const updated = await Movie.findOneAndUpdate(
               { _id: movieID },
               {
                  s_thumb: req.file.filename,
               },
               { new: true },
            ).exec();
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               movieID +
               '/' +
               updated.s_thumb;
            uploadBgImage(
               process.env.AWS_BUCKET_NAME,
               bgOutputPath,
               s3_path_key,
               req.file.filename,
               contentType,
            );
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/musiclogo', auth, admin, async (req, res) => {
   var musicID = req.query.id;
   var localImageName = '';
   var localImageNameNoExt = '';
   const CHUNK_SIZE = 10000000; // 10MB

   var logoName = '';
   const img = 'image/png';
   var ext = '';
   var localImagePath = 'thumbnails/';
   var s3_path_key = musicID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         const fs = require('fs');
         if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync('thumbnails/', { recursive: true });
         }
         cb(null, 'thumbnails/');
      },
      filename: function (req, file, cb) {
         localImageNameNoExt = nodeUuid.v4();
         ext = path.extname(file.originalname);
         localImageName = localImageNameNoExt + THUMB_EXT;
         cb(null, localImageName); // .replace(/ /g, '_' )
      },
   });

   // console.log(localImageNameNoExt);
   var upload = multer({ storage: storage }).single('userFile');
   // const outputFilePath = "thumbnails/";

   upload(req, res, async function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      console.log(req.file);
      var outputFilePath = `uploads/${req.file.filename}`;
      var bgOutputPath = `uploads/bg_${req.file.filename}`;
      var contentType = 'image/' + ext.replace('.', '');
      const imageResize = await sharp(req.file.path)
         .resize(259, 351)
         .toFile(outputFilePath);
      const bgImageResize = await sharp(req.file.path)
         .resize(909, 513)
         .toFile(bgOutputPath);
      fs.unlinkSync(req.file.path);
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(outputFilePath, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${req.file.filename}`,
         ContentType: contentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            console.log('S3 Response', result);
            musicThumbDeleteFroms3(musicID);
            fs.unlinkSync(outputFilePath); // Empty temp folder
            const updated = await Music.findOneAndUpdate(
               { _id: musicID },
               {
                  s_thumb: req.file.filename,
               },
               { new: true },
            ).exec();
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               musicID +
               '/' +
               updated.s_thumb;
            uploadBgImage(
               process.env.AWS_BUCKET_NAME,
               bgOutputPath,
               s3_path_key,
               req.file.filename,
               contentType,
            );
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/episodeLogo', auth, admin, async (req, res) => {
   var episodeID = req.query.id;
   const findSeasonID = await Series.findOne({ 'episodes._id': episodeID });
   console.log(findSeasonID._id);
   var localImageName = '';
   var localImageNameNoExt = '';
   const CHUNK_SIZE = 10000000; // 10MB

   var logoName = '';
   const img = 'image/png';
   var ext = '';
   var localImagePath = 'thumbnails/';
   var s3_path_key = findSeasonID._id;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         const fs = require('fs');
         if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync('thumbnails/', { recursive: true });
         }
         cb(null, 'thumbnails/');
      },
      filename: function (req, file, cb) {
         localImageNameNoExt = nodeUuid.v4();
         ext = path.extname(file.originalname);
         localImageName = localImageNameNoExt + THUMB_EXT;
         cb(null, localImageName); // .replace(/ /g, '_' )
      },
   });

   var upload = multer({ storage: storage }).single('userFile');

   upload(req, res, async function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      console.log(req.file);
      episodesThumbDeleteFroms3(episodeID);
      var outputFilePath = `uploads/${req.file.filename}`;
      var bgOutputPath = `uploads/bg_${req.file.filename}`;
      var contentType = 'image/' + ext.replace('.', '');
      const imageResize = await sharp(req.file.path)
         .resize(400, 224)
         .toFile(outputFilePath);
      const bgImageResize = await sharp(req.file.path)
         .resize(909, 513)
         .toFile(bgOutputPath);

      fs.unlinkSync(req.file.path);
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(outputFilePath, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${req.file.filename}`,
         ContentType: contentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            // seriesThumbDeleteFroms3(seasonID);
            fs.unlinkSync(outputFilePath); // Empty temp folder
            const updated = await Series.findOneAndUpdate(
               { 'episodes._id': episodeID },
               {
                  $set: {
                     'episodes.$.s_thumb': req.file.filename,
                  },
               },
               { new: true },
            ).exec();
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            // responce["originalName"] = originalName;
            // responce["videoURL"] =
            //   process.env.CDN_DISTRIBUTION_URL +
            //   videoID +
            //   "/" +
            //   localVideoNameNoExt +
            //   VIDEO_EXT;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL + result.Key;
            console.log(responce);
            uploadBgImage(
               process.env.AWS_BUCKET_NAME,
               bgOutputPath,
               s3_path_key,
               req.file.filename,
               contentType,
            );
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/video_upload', auth, admin, async (req, res) => {
   let videoID = req.query.id;
   var ext = '.mp4';
   var localVideoPath = '';
   var localVideoName = '';
   var localVideoNameNoExt = '';
   var originalName = '';
   var mySeriesFunction = [];
   var VIDEO_EXT = '.mp4';
   const CHUNK_SIZE = 10000000; // 10MB
   const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
   });
   var s3_path_key = videoID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         localVideoPath = 'uploads/';
         const fs = require('fs'); // Or `import fs from "fs";` with ESM
         if (!fs.existsSync(localVideoPath)) {
            fs.mkdirSync(localVideoPath, { recursive: true });
         }
         cb(null, localVideoPath);
      },
      filename: function (req, file, cb) {
         localVideoNameNoExt = nodeUuid.v4();
         originalName = file.originalname;
         //ext = path.extname(file.originalname);
         originalName = originalName.split('.').slice(0, -1).join('.');
         console.log(ext);
         console.log(originalName);
         localVideoName = localVideoNameNoExt + VIDEO_EXT;
         console.log(localVideoName);
         cb(null, localVideoName);
      },
   });
   var upload = multer({ storage: storage }).single('userFile');
   upload(req, res, function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      videoDeleteFroms3(videoID);
      var vidContentType = 'video/' + ext.replace('.', '');
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(req.file.path, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${localVideoName}`,
         ContentType: vidContentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            fs.unlinkSync(req.file.path); // Empty temp folder
            console.log(req.file);
            const updated = await Movie.findOneAndUpdate(
               { _id: videoID },
               {
                  name: localVideoName,
               },
               { new: true },
            ).exec();
            // updated.episodes["videoUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + VIDEO_EXT;
            // updated.episodes["imageUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + THUMB_EXT;
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            responce['originalName'] = originalName;
            responce['videoURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               localVideoNameNoExt +
               VIDEO_EXT;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               updated.localVideoNameNoExt +
               THUMB_EXT;
            res.status(200).json(responce);
         }
      });
   });
});
app.post('/api/v1/music_video_upload', auth, admin, async (req, res) => {
   let videoID = req.query.id;
   var ext = '.mp4';
   var localVideoPath = '';
   var localVideoName = '';
   var localVideoNameNoExt = '';
   var originalName = '';
   var mySeriesFunction = [];
   var VIDEO_EXT = '.mp4';
   const CHUNK_SIZE = 10000000; // 10MB
   const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
   });
   var s3_path_key = videoID;
   var storage = multer.diskStorage({
      destination: function (req, file, cb) {
         localVideoPath = 'uploads/';
         const fs = require('fs'); // Or `import fs from "fs";` with ESM
         if (!fs.existsSync(localVideoPath)) {
            fs.mkdirSync(localVideoPath, { recursive: true });
         }
         cb(null, localVideoPath);
      },
      filename: function (req, file, cb) {
         localVideoNameNoExt = nodeUuid.v4();
         originalName = file.originalname;
         //ext = path.extname(file.originalname);
         originalName = originalName.split('.').slice(0, -1).join('.');
         console.log(ext);
         console.log(originalName);
         localVideoName = localVideoNameNoExt + VIDEO_EXT;
         console.log(localVideoName);
         cb(null, localVideoName);
      },
   });
   var upload = multer({ storage: storage }).single('userFile');
   upload(req, res, function (err) {
      if (err) {
         return res.send({ message: 'Error uploading files', err: err });
      }
      musicVideoDeleteFroms3(videoID);
      var vidContentType = 'video/' + ext.replace('.', '');
      let params = {
         Bucket: process.env.AWS_BUCKET_NAME,
         Body: fs.createReadStream(req.file.path, {
            highWaterMark: CHUNK_SIZE,
         }),
         Key: `${s3_path_key}/${localVideoName}`,
         ContentType: vidContentType,
      };
      s3.upload(params, async (err, result) => {
         if (err) {
            console.log(
               'Error occured while trying to upload to S3 bucket',
               err,
            );
         } else {
            // resolve("S3 Upload Complete " + result);
            console.log('S3 Response', result);
            fs.unlinkSync(req.file.path); // Empty temp folder
            console.log(req.file);
            const updated = await Music.findOneAndUpdate(
               { _id: videoID },
               {
                  name: localVideoName,
               },
               { new: true },
            ).exec();
            // updated.episodes["videoUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + VIDEO_EXT;
            // updated.episodes["imageUrl"] =  process.env.CDN_DISTRIBUTION_URL + videoID +"/" +  localVideoNameNoExt + THUMB_EXT;
            var responce = {};
            responce['_id'] = updated._id;
            responce['error'] = false;
            responce['originalName'] = originalName;
            responce['videoURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               localVideoNameNoExt +
               VIDEO_EXT;
            responce['thumbnailURL'] =
               process.env.CDN_DISTRIBUTION_URL +
               videoID +
               '/' +
               updated.localVideoNameNoExt +
               THUMB_EXT;
            res.status(200).json(responce);
         }
      });
   });
});
///===============================================================================================////
///===================================UPDATE API's================================================////
///===============================================================================================////
app.post('/api/v1/updateSeasonInfo', auth, admin, async (req, res) => {
   const videoId = req.query.id;
   const name = req.body.name;
   const description = req.body.description;
   const price = req.body.price;
   const public = req.body.public;
   const catagory = req.body.catagory;
   var obj = {};
   if (name) {
      obj.name = name;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId[0]._id);
      obj.catagory = catagoryId[0]._id;
   }
   console.log(req.body);
   try {
      Series.findByIdAndUpdate(
         { _id: videoId },
         { $set: obj },
         { new: true },
         (err, doc) => {
            if (err) return res.json({ success: false, err });
            updateCatagoryWhenUpdateSeasonInfo(catagory, videoId);
            res.status(200).json({
               success: true,
               season: doc,
            });
         },
      );
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Movie create failed. Try again.' });
   }
});

app.post('/api/v1/updateEpisodeInfo', auth, admin, async (req, res) => {
   try {
      const id = req.query.id;
      const { name, description } = req.body;
      await Series.findOneAndUpdate(
         { 'episodes._id': req.query.id },
         {
            $set: {
               'episodes.$.originalName': req.body.name,
               'episodes.$.description': req.body.description,
            },
         },
         { new: true },
         (err, doc) => {
            if (err) console.log(err);
            res.status(200).json({ success: true, doc });
         },
      );
      // const updated = await Series.findOneAndUpdate(
      //     {"episodes._id" : id},
      //     {
      //       $set:{
      //         "episodes.$.originalName" : name,
      //         "episodes.$.description": description,

      //       },

      //     },
      //     {new : true}
      // ).exec();
      // res.status(200).json({success: true ,updated});
   } catch (err) {
      console.log(err);
      return res.status(400).send('Add episode failed');
   }
});
app.post('/api/v1/updateCategory', auth, admin, (req, res) => {
   const catagoryID = req.body.id;
   const name = req.body.name;
   const description = req.body.description;
   var obj = {};
   if (name) {
      obj.name = name;
   }
   if (description) {
      obj.description = description;
   }
   Catagory.findByIdAndUpdate(
      { _id: catagoryID },
      { $set: obj },
      { new: true },
      (err, catagory) => {
         if (err) return res.json({ success: false, err });
         res.status(200).json({
            success: true,
            catagory: catagory,
         });
      },
   );
});
app.post('/api/v1/updateVideoInfo', auth, admin, async (req, res) => {
   const movieId = req.query.id;
   const originalName = req.body.name;
   const description = req.body.description;
   const catagory = req.body.catagory;
   const public = req.body.public;
   const price = req.body.price;
   console.log(originalName);

   var obj = {};
   if (originalName) {
      obj.originalName = originalName;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId);
      obj.catagory = catagoryId[0]._id;
   }
   try {
      Movie.findByIdAndUpdate(
         { _id: movieId },
         { $set: obj },
         { new: true },
         (err, doc) => {
            if (err) return res.json({ success: false, err });
            updateCatagoryWhenUpdateMovieInfo(catagory, movieId);
            res.status(200).json({
               success: true,
               movie: doc,
            });
         },
      );
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Movie create failed. Try again.' });
   }
});
app.post('/api/v1/updateMusicInfo', auth, admin, async (req, res) => {
   const musicId = req.query.id;
   const originalName = req.body.name;
   const description = req.body.description;
   const catagory = req.body.catagory;
   const public = req.body.public;
   const price = req.body.price;
   console.log(originalName);

   var obj = {};
   if (originalName) {
      obj.originalName = originalName;
   }
   if (description) {
      obj.description = description;
   }
   if (price) {
      obj.price = price;
   }
   if (public) {
      obj.public = public;
   }
   if (catagory) {
      const catagoryId = await Catagory.find({ name: catagory });
      console.log(catagoryId[0]._id);
      obj.catagory = catagoryId[0]._id;
   }
   try {
      Music.findByIdAndUpdate(
         { _id: musicId },
         { $set: obj },
         { new: true },
         (err, doc) => {
            if (err) return res.json({ success: false, err });
            updateCatagoryWhenUpdateMusicInfo(catagory, musicId);
            res.status(200).json({
               success: true,
               movie: doc,
            });
         },
      );
   } catch (err) {
      console.log(err);
      return res
         .status(400)
         .json({ success: false, message: 'Movie create failed. Try again.' });
   }
});

///===============================================================================================////
///===================List Categories , Series , Moviese , Music===================////
///===============================================================================================////
app.get('/api/v1/homepage', async (req, res) => {
   try {
      Promise.all([
         Catagory.find({})
            .populate({
               path: 'movies',
               populate: { path: 'catagory', model: 'Category' },
            })
            .populate({
               path: 'series',
               populate: { path: 'catagory', model: 'Category' },
            })
            .populate({
               path: 'music',
               populate: { path: 'catagory', model: 'Category' },
            }),
      ]).then(([catagoriesData, seriesData, moviesData, musicData]) => {
         var catagories = JSON.parse(JSON.stringify(catagoriesData));
         for (let i = 0; i < catagoriesData.length; i++) {
            for (let j = 0; j < catagoriesData[i].music.length; j++) {
               catagories[i].music[j]['thumbnail_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].music[j]._id +
                  '/' +
                  catagories[i].music[j].s_thumb;
               catagories[i].music[j]['background_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].music[j]._id +
                  '/bg_' +
                  catagories[i].music[j].s_thumb;
               catagories[i].music[j]['video_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].music[j]._id +
                  '/' +
                  catagories[i].music[j].name;
            }
         }
         for (let i = 0; i < catagoriesData.length; i++) {
            for (let j = 0; j < catagoriesData[i].movies.length; j++) {
               catagories[i].movies[j]['thumbnail_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].movies[j]._id +
                  '/' +
                  catagories[i].movies[j].s_thumb;
               catagories[i].movies[j]['background_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].movies[j]._id +
                  '/bg_' +
                  catagories[i].movies[j].s_thumb;
               catagories[i].movies[j]['video_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].movies[j]._id +
                  '/' +
                  catagories[i].movies[j].name;
            }
         }
         for (let i = 0; i < catagoriesData.length; i++) {
            for (let j = 0; j < catagoriesData[i].series.length; j++) {
               catagories[i].series[j]['thumbnail_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].series[j]._id +
                  '/' +
                  catagories[i].series[j].s_thumb;
               catagories[i].series[j]['background_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  catagories[i].series[j]._id +
                  '/bg_' +
                  catagories[i].series[j].s_thumb;
               // catagories[i].movies[j]["video_url"] =process.env.CDN_DISTRIBUTION_URL +catagories[i].movies[j]._id + "/" +catagories[i].movies[j].name;
               for (
                  let k = 0;
                  k < catagoriesData[i].series[j].episodes.length;
                  k++
               ) {
                  catagories[i].series[j].episodes[k]['thumbnail_url'] =
                     process.env.CDN_DISTRIBUTION_URL +
                     catagories[i].series[j]._id +
                     '/' +
                     catagories[i].series[j].episodes[k].s_thumb;
                  catagories[i].series[j].episodes[k]['background_url'] =
                     process.env.CDN_DISTRIBUTION_URL +
                     catagories[i].series[j]._id +
                     '/bg_' +
                     catagories[i].series[j].episodes[k].s_thumb;
                  catagories[i].series[j].episodes[k]['video_url'] =
                     process.env.CDN_DISTRIBUTION_URL +
                     catagories[i].series[j]._id +
                     '/' +
                     catagories[i].series[j].episodes[k].name +
                     VIDEO_EXT;
               }
            }
         }

         res.status(200).json({ success: true, catagories });
      });
   } catch (err) {
      console.log(err);
   }
});
app.get('/api/v1/listMusic', async (req, res) => {
   try {
      Promise.all([Music.find({}).populate('catagory', 'name')]).then(
         ([musicData]) => {
            var music = JSON.parse(JSON.stringify(musicData));
            for (var i in music) {
               music[i]['thumbnail_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  music[i]._id +
                  '/' +
                  music[i].s_thumb;
               music[i]['video_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  music[i]._id +
                  '/' +
                  music[i].name;
            }

            res.status(200).json({ success: true, music });
         },
      );
   } catch (err) {
      console.log(err);
   }
});
app.get('/api/v1/listMovies', async (req, res) => {
   try {
      Promise.all([
         Movie.find({}).sort({ createdAt: -1 }).populate('catagory', 'name'),
      ]).then(([moviesData]) => {
         var movies = JSON.parse(JSON.stringify(moviesData));
         for (var i in movies) {
            movies[i]['thumbnail_url'] =
               process.env.CDN_DISTRIBUTION_URL +
               movies[i]._id +
               '/' +
               movies[i].s_thumb;
            movies[i]['video_url'] =
               process.env.CDN_DISTRIBUTION_URL +
               movies[i]._id +
               '/' +
               movies[i].name;
         }

         res.status(200).json({ success: true, movies });
      });
   } catch (err) {
      console.log(err);
   }
});
app.get('/api/v1/listSeries', async (req, res) => {
   try {
      Promise.all([Series.find({}).populate('catagory', 'name')]).then(
         ([seriesData, moviesData, musicData]) => {
            var series = JSON.parse(JSON.stringify(seriesData));
            for (let i = 0; i < series.length; i++) {
               series[i]['thumbnail_url'] =
                  process.env.CDN_DISTRIBUTION_URL +
                  series[i]._id +
                  '/' +
                  series[i].s_thumb;
               for (let j = 0; j < series[i].episodes.length; j++) {
                  series[i].episodes[j]['thumbnail_url'] =
                     process.env.CDN_DISTRIBUTION_URL +
                     series[i]._id +
                     '/' +
                     series[i].episodes[j].s_thumb;
                  series[i].episodes[j]['video_url'] =
                     process.env.CDN_DISTRIBUTION_URL +
                     series[i]._id +
                     '/' +
                     series[i].episodes[j].name +
                     VIDEO_EXT;
               }
            }

            res.status(200).json({ success: true, series });
         },
      );
   } catch (err) {
      console.log(err);
   }
});
app.get('/api/v1/getSeasonbyId', async (req, res) => {
   try {
      Promise.all([
         Series.findById({ _id: req.body.id }).populate('catagory', 'name'),
      ]).then(([seriesData]) => {
         var series = JSON.parse(JSON.stringify(seriesData));
         series['thumbnail_url'] =
            process.env.CDN_DISTRIBUTION_URL +
            series._id +
            '/' +
            series.s_thumb;
         series[
            'background_url'
         ] = `${process.env.CDN_DISTRIBUTION_URL}${series._id}/bg_${series.s_thumb}`;
         for (let j = 0; j < series.episodes.length; j++) {
            series.episodes[j]['thumbnail_url'] =
               process.env.CDN_DISTRIBUTION_URL +
               series._id +
               '/' +
               series.episodes[j].s_thumb;
            series.episodes[j][
               'background_url'
            ] = `${process.env.CDN_DISTRIBUTION_URL}${series._id}/bg_${series.episodes[j].s_thumb}`;
            series.episodes[j]['video_url'] =
               process.env.CDN_DISTRIBUTION_URL +
               series._id +
               '/' +
               series.episodes[j].name +
               VIDEO_EXT;
         }

         res.status(200).json({ success: true, series });
      });
   } catch (err) {
      console.log(err);
   }
});

app.listen(PORT, () => {
   console.log('App is listening to port ' + PORT);
});
