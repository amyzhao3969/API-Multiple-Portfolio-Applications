// server.js
// where your node app starts

// init project
require('dotenv').config();
var express = require('express');
const path = require('path');
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
const shortid = require('shortid');
var multer  = require('multer')
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

app.get("/filemetadata", function (req, res) {
  res.sendFile(__dirname + '/views/filemetadata.html');
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
let exerciseSessionSchema = new mongoose.Schema({
  date: String,
  duration: {type: Number, required: true},
  description: {type: String, required: true}
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

var Session = mongoose.model("Session", exerciseSessionSchema)
var ExerciseUser = mongoose.model("ExerciseUser", userSchema)


app.post("/api/exercise/new-user", (req, res) => {
  let username = req.body['username'];
  let exerciseUser = new ExerciseUser({
    username: username
  });

  exerciseUser.save(function(err, savedUser) {
    if (err) return console.error(err);
    res.json({
      "username": savedUser.username,
      "_id": savedUser.id
    });
  })
});

app.get("/api/exercise/users", (req, res) => {
  ExerciseUser.find({}, (err, arrayOfUsers) => {
    res.json(arrayOfUsers)
  })
});

app.post("/api/exercise/add", (req, res) => {
  let newSession = new Session({
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date
  })

  if(newSession.date === "") {
    newSession.date = new Date().toISOString().substring(0, 10)
  }

  ExerciseUser.findByIdAndUpdate(
    req.body.userId,
    {$push: {log: newSession}},
    {new: true},
    (error, updatedUser) => {
      if(!error) {
      let resObj = {}
      resObj['_id'] = updatedUser.id
      resObj['username'] = updatedUser.username
      resObj['date'] = new Date(newSession.date).toDateString()
      resObj['description'] = newSession.description
      resObj['duration'] = newSession.duration
      res.json(resObj)
    }
  })

});

app.get("/api/exercise/log", (req, res) => {
  ExerciseUser.findById(
    req.query.userId,
    (error, result) => {
      if(!error) {
        let resObjLogs = result
        if(req.query.from || req.query.to) {
          let fromDate = new Date(0) //create a date object to the oldest time
          let toDate = new Date() //create a date object with current time

          if(req.query.from) {
            fromDate = new Date(req.query.from)
            console.log(fromDate)
          }

          if(req.query.to) {
            toDate = new Date(req.query.to)
          }

          fromDate = fromDate.getTime()
          console.log(fromDate)
          toDate = toDate.getTime()
          console.log(toDate)

          resObjLogs.log = resObjLogs.log.filter((session) => {
            let sessionDate = new Date(session.date).getTime()
            //console.log(session) - this is the logs of sessions
            //console.log(sessionDate) - to convert them to number of milliseconds 
            return sessionDate >= fromDate && sessionDate <= toDate
          })
        }

        if(req.query.limit){
          resObjLogs.log = resObjLogs.log.slice(0, req.query.limit)
          console.log(req.query.limit)
        }

        resObjLogs = resObjLogs.toJSON()
        resObjLogs['count'] = resObjLogs.log.length
        res.json(resObjLogs)
      }
    }
  )
});

//file metadata
app.post('/filemetadata/api/fileanalyse', multer().single('upfile'), (req, res) => {
  var resp = {
    "name": req.file.originalname,
    "type": req.file.mimetype,
    "size": req.file.size
  };
  console.log(resp);
  res.json(resp);
})

// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

