const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const multer  = require('multer')
app.use(express.static(__dirname + "/public"));
var bodyParser = require('body-parser');

app.use('/pictures', express.static(`${process.cwd()}/pictures`));
//mongoose
const mongoose = require('mongoose');

const { MongoClient } = require('mongodb');

const { Schema } = mongoose;

mongoose.connect('mongodb+srv://vizzy:vizzy363@backend.vpzczlo.mongodb.net/tracker?retryWrites=true&w=majority', {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

app.use(express.static(__dirname + "/pictures"))


app.use('/pictures', express.static(process.cwd() + '/pictures'));

app.use('/public', express.static(process.cwd() + '/public'));
//initial html

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/index.html");
  });

  app.get("/views/timestamp.html", function(req, res) {
    res.sendFile(__dirname + "/views/timestamp.html");
  });

  app.get("/", function(req, res) {
    res.sendFile(__dirname + "/pictures/favicon.ico");
  });

  app.get("/views/exercise-tracker.html",(req, res) =>{
    res.sendFile(__dirname + "/views/exercise-tracker.html")
  })

  //exercise tracker
  app.use(express.json());
app.use(express.urlencoded( {extended: true} ));

  
  
  const userSchema = new Schema({
      username: {
          type: String,
          required: true
      }
  });
  

  const User= mongoose.model('User', userSchema);

  const exerciseSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use((req, res, next) => {
  console.log("method: " + req.method + "  |  path: " + req.path + "  |  IP - " + req.ip);
  next();
});

app.route('/api/users').get((req, res) => {
  User.find({}, (error, data) => {
    //console.log(data);
    res.json(data);
  });
}).post((req, res) => {
  // Get username input into form
  const potentialUsername = req.body.username;
  console.log("potential username:", potentialUsername);

  // Check to see if the username has already been entered
  User.findOne({username: potentialUsername}, (error, data) => {
    if (error) {
      res.send("Unknown userID");
      return console.log(error);
    }

    if (!data) { // If username is not stored yet, create and save a User object
      const newUser = new User({
        username: potentialUsername
      });

      // Save the user
      newUser.save((error, data) => {
        if (error) return console.log(error);
        // Remove the key-value pair associated with the key __v
        const reducedData = {
          "username": data.username, 
          "_id": data._id
        };
        res.json(reducedData);
        console.log(reducedData);
      });
    } else { // If username is already stored, send a message to the user
      res.send(`Username ${potentialUsername} already exists.`);
      console.log(`Username ${potentialUsername} already exists.`);
    }
  });
});

// PATH /api/users/:_id/exercises
// POST: Store new exercise in the Exercise model 
app.post('/api/users/:_id/exercises', (req, res) => {
  // Get data from form
  const userID = req.body[":_id"] || req.params._id;
  const descriptionEntered = req.body.description;
  const durationEntered = req.body.duration;
  const dateEntered = req.body.date;

  // Print statement for debugging
  console.log(userID, descriptionEntered, durationEntered, dateEntered);

  // Make sure the user has entered in an id, a description, and a duration
  // Set the date entered to now if the date is not entered
  if (!userID) {
    res.json("Path `userID` is required.");
    return;
  }
  if (!descriptionEntered) {
    res.json("Path `description` is required.");
    return;
  }
  if (!durationEntered) {
    res.json("Path `duration` is required.");
    return;
  }

  // Check if user ID is in the User model
  User.findOne({"_id": userID}, (error, data) => {
    if (error) {
      res.json("Invalid userID");
      return console.log(error);
    }
    if (!data) {
      res.json("Unknown userID");
      return;
    } else {
      console.log(data);
      const usernameMatch = data.username;
      
      // Create an Exercise object
      const newExercise = new Exercise({
        username: usernameMatch,
        description: descriptionEntered,
        duration: durationEntered
      });

      // Set the date of the Exercise object if the date was entered
      if (dateEntered) {
        newExercise.date = dateEntered;
      }

      // Save the exercise
      newExercise.save((error, data) => {
        if (error) return console.log(error);

        console.log(data);

        // Create JSON object to be sent to the response
        const exerciseObject = {
          "_id": userID,
          "username": data.username,
          "date": data.date.toDateString(),
          "duration": data.duration,
          "description": data.description
        };

        // Send JSON object to the response
        res.json(exerciseObject);

      });
    }
  });
});


// PATH /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', (req, res) => {
  const id = req.body["_id"] || req.params._id;
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = req.query.limit;

  console.log(id, fromDate, toDate, limit);

  // Validate the query parameters
  if (fromDate) {
    fromDate = new Date(fromDate);
    if (fromDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (toDate) {
    toDate = new Date(toDate);
    if (toDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (limit) {
    limit = new Number(limit);
    if (isNaN(limit)) {
      res.json("Invalid Limit Entered");
      return;
    }
  }

  // Get the user's information
  User.findOne({ "_id" : id }, (error, data) => {
    if (error) {
      res.json("Invalid UserID");
      return console.log(error);
    }
    if (!data) {
      res.json("Invalid UserID");
    } else {

      // Initialize the object to be returned
      const usernameFound = data.username;
      var objToReturn = { "_id" : id, "username" : usernameFound };

      // Initialize filters for the count() and find() methods
      var findFilter = { "username" : usernameFound };
      var dateFilter = {};

      // Add to and from keys to the object if available
      // Add date limits to the date filter to be used in the find() method on the Exercise model
      if (fromDate) {
        objToReturn["from"] = fromDate.toDateString();
        dateFilter["$gte"] = fromDate;
        if (toDate) {
          objToReturn["to"] = toDate.toDateString();
          dateFilter["$lt"] = toDate;
        } else {
          dateFilter["$lt"] = Date.now();
        }
      }

      if (toDate) {
        objToReturn["to"] = toDate.toDateString();
        dateFilter["$lt"] = toDate;
        dateFilter["$gte"] = new Date("1960-01-01");
      }

      // Add dateFilter to findFilter if either date is provided
      if (toDate || fromDate) {
        findFilter.date = dateFilter;
      }

      // console.log(findFilter);
      // console.log(dateFilter);

      // Add the count entered or find the count between dates
      Exercise.count(findFilter, (error, data) => {
        if (error) {
          res.json("Invalid Date Entered");
          return console.log(error);
        }
        // Add the count key 
        var count = data;
        if (limit && limit < count) {
          count = limit;
        }
        objToReturn["count"] = count;


        // Find the exercises and add a log key linked to an array of exercises
        Exercise.find(findFilter, (error, data) => {
          if (error) return console.log(error);

          // console.log(data);

          var logArray = [];
          var objectSubset = {};
          var count = 0;

          // Iterate through data array for description, duration, and date keys
          data.forEach(function(val) {
            count += 1;
            if (!limit || count <= limit) {
              objectSubset = {};
              objectSubset.description = val.description;
              objectSubset.duration = val.duration;
              objectSubset.date = val.date.toDateString();
              console.log(objectSubset);
              logArray.push(objectSubset);
            }
          });

          // Add the log array of objects to the object to return
          objToReturn["log"] = logArray;

          // Return the completed JSON object
          res.json(objToReturn);
        });

      });

    }
  });
});

// ----------------
// ADDITIONAL PATHS (not required for the FreeCodeCamp project)

// PATH /api/exercises/
// Display all of the exercises in the Mongo DB model titled Exercise
app.get('/api/exercises', (req, res) => {
  Exercise.find({}, (error, data) => {
    if (error) return console.log(error);
    res.json(data);
  })
});

//filemetadata

app.get("/views/filemetadata.html", function(req, res) {
  res.sendFile(__dirname + "/views/filemetadata.html");
});

const upload = multer({ dest: 'uploads/' })

app.post('/api/fileanalyse', upload.single('upfile'), (req, res) => {
  try {
    res.json({
      "name": req.file.originalname,
      "type": req.file.mimetype,
      "size": req.file.size
    });
  } catch (err) {
    res.send(400);
  }
});

//headpraser

app.get("/views/headpraser.html", function(req, res) {
  res.sendFile(__dirname + "/views/headpraser.html");
});

app.get("/views/api/whoami", (req, res)=>{
  const ip = req.ip;
  const language = req.headers['accept-language']
  const software = req.headers['user-agent']
  res.json({ipaddress: ip, language:language, software,software});
})

//timestamp




app.get("/views/api/:date?", (req, res) => {
  const givenDate = req.params.date;
  let date;

  
  if (!givenDate) {
    date = new Date();
  } else {
  
    const checkUnix = givenDate * 1;
    date = isNaN(checkUnix) ? new Date(givenDate) : new Date(checkUnix);
  }

  
  if (date == "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    const unix = date.getTime();
    const utc = date.toUTCString();
    res.json({ unix, utc });
  }
});

//urlshort


app.get('/views/urlshort.html', function(req, res) {
  res.sendFile(process.cwd() + '/views/urlshort.html');
});


const urlshort = new Schema({
  original : {type: String, required: true},
  short : Number
})

const  Url = mongoose.model("Url", urlshort) 

app.post ("/views/api/shorturl", bodyParser.urlencoded({ extended: false }),(req, res)=>{
  let inputUrl = req.body['url']

  let urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi)
  if(!inputUrl.match(urlRegex)){
    res.json({error: 'Invalid url'})
    return
  }
  let inputShort = 1

  Url.findOne({})
    .sort({short:'desc'})
    .exec((err, result) =>{
      if(!err && result != undefined){
        inputShort = result.short + 1
      }
      if(!err){
        Url.findOneAndUpdate(
          {
            original: inputUrl
          },
          {original:inputUrl, short: inputShort },
          {new:true, upsert: true},
          (err,savedUrl) =>{
            if(!err){
              res.json({original_url: inputUrl, short_url: savedUrl.short})
            }
          }
        )
      }
    })
 
  
})


app.get("/views/api/shorturl/:input", (req,res)=>{
  let input = req.params.input

  Url.findOne({short: input}, (err,result)=>{
    if(!err && result != undefined){
      res.redirect(result.original)
    }else{
      res.json('URL not found')
    }
  })
})

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});


