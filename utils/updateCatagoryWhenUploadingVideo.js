
const { Catagory } = require("../models/catagory");
const { Movie} = require("../models/movies");
const { Music } = require("../models/music");
const { Series } = require("../models/series");
async function updateCatagoryWhenUploadingMovie(name ,movieId){
  const pushMovieId = await Catagory.findOneAndUpdate(
    {name : name},
    {$push : {movies : movieId}}
  );
  }
async function updateCatagoryWhenUploadingMusic(name ,musicId){
  const pushMusicId = await Catagory.findOneAndUpdate(
      {name : name},
      {$push : {music : musicId}}
    );
    }
  async function updateCatagoryWhenUpdateMovieInfo(name , movieId){
    console.log(name , movieId);
    const catagory = await Catagory.find({$and : [{name :name} ,{movies : movieId} ]});
    console.log(catagory.length);
      if(catagory.length ===0){
        const pullSeriesId = await Catagory.updateMany({}, {$pull : {movies : {$in :movieId }}});
        const pushSeriesId = await Catagory.findOneAndUpdate(
          {name : name},
          {$push : {movies : movieId}}
        );
        console.log("Catagory Updated")
      }else{
        console.log("Nothing to Update")
      }
  }
  async function updateCatagoryWhenUpdateMusicInfo(name , musicId){
    console.log(name , musicId);
    const catagory = await Catagory.find({$and : [{name :name} ,{music : musicId} ]});
    console.log(catagory.length);
      if(catagory.length ===0){
        const pullSeriesId = await Catagory.updateMany({}, {$pull : {music : {$in :musicId }}});
        const pushSeriesId = await Catagory.findOneAndUpdate(
          {name : name},
          {$push : {music : musicId}}
        );
        console.log("Catagory Updated")
      }else{
        console.log("Nothing to Update")
      }
  }
async function updateCatagoryWhenUpdateSeasonInfo(name , seriesID){
    console.log(name , seriesID);
    const catagory = await Catagory.find({$and : [{name :name} ,{series : seriesID} ]});
    console.log(catagory.length);
      if(catagory.length ===0){
        const pullSeriesId = await Catagory.updateMany({}, {$pull : {series : {$in :seriesID }}});
        const pushSeriesId = await Catagory.findOneAndUpdate(
          {name : name},
          {$push : {series : seriesID}}
        );
        console.log("Catagory Updated")
      }else{
        console.log("Nothing to Update")
      }
}
async function updateCatagoryWhenCreatingSeason(name , seriesID){
    console.log(name , seriesID);
    const pushSeriesId = await Catagory.findOneAndUpdate(
      {name : name},
      {$push : {series : seriesID}}
    );
    console.log("Catagory Updated")
}
async function updateCatagoryWhenDeleteSeason(seriesID){
  const pullSeriesId = await Catagory.updateMany({}, {$pull : {series : {$in :seriesID }}});
}
async function updateCatagoryWhenDeleteMovie(movieID){
  const pullMovieId = await Catagory.updateMany({}, {$pull : {movies : {$in :movieID }}});
}
async function updateCatagoryWhenDeleteMusic(musicID){
  const pullMusicId = await Catagory.updateMany({}, {$pull : {music : {$in :music }}});
}

async function updateVideosWhenDeleteCatagory(catagoryID){
  const updateMovie = await Movie.updateMany({catagory:catagoryID} ,
     {$unset : {catagory :""}}
     );
     const updateMusic = await Music.updateMany({catagory:catagoryID} ,
      {$unset : {catagory :""}}
      );
      const updateSeason = await Series.updateMany({catagory:catagoryID} ,
        {$unset : {catagory :""}}
        );
}
    
  module.exports = {
     updateCatagoryWhenUploadingMovie,
     updateCatagoryWhenUpdateMovieInfo,
     updateCatagoryWhenUpdateSeasonInfo,
     updateCatagoryWhenCreatingSeason,
     updateCatagoryWhenDeleteSeason,
     updateCatagoryWhenDeleteMovie,
     updateCatagoryWhenUploadingMusic,
     updateCatagoryWhenUpdateMusicInfo,
     updateCatagoryWhenDeleteMusic,
     updateVideosWhenDeleteCatagory
    };