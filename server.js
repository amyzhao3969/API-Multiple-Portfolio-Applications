// server.js
// where your node app starts

// init project
require('dotenv').config();
var express = require('express');
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
const shortid = require('shortid');
var app = express();
var port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + '/views/requestHeaderParser.html');
});

app.get("/urlShortenerMicroservice", function (req, res) {
  res.sendFile(__dirname + '/views/urlshortner.html');
});

app.get("/exercisetracker", function (req, res) {
  res.sendFile(__dirname + '/views/exercisetracker.html');
});

app.get("/api/hello", function (req, res) {
  console.log({greeting: "hello API"});
  res.json({greeting: 'hello API'});
});

//timestamp
app.get("/api/timestamp", function(req, res) {
  var now = new Date();
  res.json({
    "unix": now.getTime(),
    "utc": now.toUTCString()
  });
});

app.get("/api/timestamp/:date_string", function(req, res) {
  let dateString = req.params.date_string;
  console.log(dateString, typeof dateString, Object.keys(dateString));

  if (parseInt(dateString) > 10000) {
    let unixTime = new Date(parseInt(dateString));
    res.json({
      "unix": unixTime.getTime(),
      "utc": unixTime.toUTCString()
    })
  }

  let passedInValue = new Date(dateString); 

  if (passedInValue == "Invalid Date") {
    res.json({"error": "Invalid Date"});
  } else {
    res.json({
      "unix": passedInValue.getTime(),
      "utc": passedInValue.toUTCString()
    })
  }
})

//headerparser
app.get("/api/whoami", function (req, res) {
  
  res.json({
  "ipaddress": req.ip, 
  "language": req.headers["accept-language"], 
  "software": req.headers["user-agent"]
  //"header": req.headers
  });
});

//url shortener
//build a schema and model to store saved URLs
const Schema = mongoose.Schema;
var ShortURL = mongoose.model("ShortURL", new Schema({
  short_url: String,
  original_url: String,
  suffix: String
}))

//mount body parser here
//parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// create application/json parser
app.post("/api/shorturl/new", function(req, res) {
  let client_requested_url = req.body.url;
  let suffix = shortid.generate();
  let newShortURL = suffix

  
  let newURL = new ShortURL({
    short_url: newShortURL,
    original_url: client_requested_url,
    suffix: suffix
  })

  let regex = /(^http|^https):\/\//i;
  newURL.save(function(err, doc) {
    if (!client_requested_url.match(regex)) {
      console.log("invalid url");
      res.json({"error": "invalid url"});
    } else {
    console.log("Document inserted successfully!");
    res.json({
      "saved": true,
      "short_url": newURL.short_url,
      "original_url": newURL.original_url,
      "suffix": newURL.suffix
    });
  }
  })
});

app.get("/api/shorturl/:suffix", function(req, res) {
  let userGeneratedSuffix = req.params.suffix;
  ShortURL.find({
    suffix: userGeneratedSuffix
  }, function (err, docs) {
    if (err) return console.log(err);
    //res.redirect(newURL.original_url);
  }).then(function(foundURL) {
    console.log(foundURL[0]);
    res.redirect(foundURL[0].original_url);
  })
})


//exercise tracker
//build a schema and model to store username and id
var ExerciseUser = mongoose.model("ExerciseUser", new Schema({
  _id: String,
  username: String
}))

app.post("/api/exercise/new-user", (req, res) => {
  let username = req.body['username'];
  let userID = mongoose.Types.ObjectId();

  let exerciseUser = new ExerciseUser({
    username: username,
    _id: userID
  })

  exerciseUser.save(function(err, doc) {
    if (err) return console.error(err);
    res.json({
      "username": exerciseUser.username,
      "_id": exerciseUser._id
    });
  })
});

app.get("/api/exercise/users", function(req, res) {
  let userInput = req.params.username;
  console.log(req.params.username);
  user.find({
    username: userInput
  }, function (err, docs) {
    if (err) return console.log(err);
    //res.redirect(newURL.original_url);
  }).then(function(foundUser) {
    console.log(foundUser[0]);
    res.json("hello");
  })
});
  
// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

