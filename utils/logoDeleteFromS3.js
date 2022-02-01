
const { Series } = require("../models/series");
const { Movie } = require("../models/movies");
const { s3Upload, s3Delete, s3MultipleUpload } = require("./../utils/s3Browser");
const { Music } = require("../models/music");

async function seriesThumbDeleteFroms3(seriesID ){
  const series = await Series.findById({_id : seriesID});
  if(series.s_thumb== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Image File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
    //var original = franchiseID + "/" + franchise.logoName +"_original"+ franchise.logoExt;
    var poster= seriesID + "/" + series.s_thumb ;
    var bgPoster= `${seriesID}/bg_${series.s_thumb}` ;
   await s3Delete(poster);
   await s3Delete(bgPoster);
 
  }
}
async function moviesThumbDeleteFroms3(movieID ){
  const movie = await Movie.findById({_id : movieID});
  if(movie.s_thumb== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Image File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
    //var original = franchiseID + "/" + franchise.logoName +"_original"+ franchise.logoExt;
    var poster= movieID + "/" + movie.s_thumb ;
    var bgPoster= `${movieID}/bg_${movie.s_thumb}` ;
    await s3Delete(poster);
    await s3Delete(bgPoster);
  }
}
async function musicThumbDeleteFroms3(musicID ){
  const music = await Music.findById({_id : musicID});
  if(music.s_thumb== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Image File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
    //var original = franchiseID + "/" + franchise.logoName +"_original"+ franchise.logoExt;
    var poster= musicID + "/" + music.s_thumb ;
    var bgPoster= `${musicID}/bg_${music.s_thumb}` ;
    await s3Delete(poster);
   await s3Delete(bgPoster);
   
  }
}
async function episodesThumbDeleteFroms3(episodeID ){
  const seasonEpisode = await Series.find({"episodes._id" : episodeID} , {episodes : {$elemMatch : {_id : episodeID}}});
  var result = {};
  result.seasonId= seasonEpisode[0]._id;
  result.s_thumb= seasonEpisode[0].episodes[0].s_thumb;
  result.thumbAddress= `${result.seasonId}/${seasonEpisode[0].episodes[0].s_thumb}`;
  if(result.s_thumb== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Image File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
    //var original = franchiseID + "/" + franchise.logoName +"_original"+ franchise.logoExt;
    var bgPoster=  `${result.seasonId}/bg_${seasonEpisode[0].episodes[0].s_thumb}`;
    await s3Delete(result.thumbAddress);
    await s3Delete(bgPoster);
   
  
  }
}

async function videoDeleteFroms3(videoID ){
  const video = await Movie.findById({_id : videoID});
  //console.log(franchise);
  if(video.name== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Video File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
   
    var videoName= videoID + "/" + video.name;
   
    s3Delete(videoName);
  
  }
}
async function musicVideoDeleteFroms3(videoID ){
  const music = await Music.findById({_id : videoID});
  //console.log(franchise);
  if(music.name== null){
    console.log(">>>>>>>>>>>>>>>>>>>  No Video File  <<<<<<<<<<<<<<<<<<<<<");
  }else{
   
    var videoName= videoID + "/" + music.name;
   
    s3Delete(videoName);
  
  }
}

module.exports = { moviesThumbDeleteFroms3  , videoDeleteFroms3,seriesThumbDeleteFroms3 , episodesThumbDeleteFroms3 , musicThumbDeleteFroms3 , musicVideoDeleteFroms3};