var express      = require('express'),
    app          = express(),
    session      = require('express-session'),
    admin        = require("firebase-admin"),
    bodyParser   = require("body-parser");
    
//0Configurations-------------------------------------------------------------->
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/www'));

app.use(session({
    cookieName: 'session',
    secret: "Secret Louis",
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    secure : true
}));

var serviceAccount = require("./private/earth-space-firebase-adminsdk-vvjb3-6435dcdc65.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://earth-space.firebaseio.com"
});

//0Middleware------------------------------------------------------------------>

//0Routes---------------------------------------------------------------------->
var indexRoute = require('./routes/index');

app.use(indexRoute);

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server Started!");
});

function convertToCoordinates(){
  var db = admin.database();
  var currentDate = new Date();
  db.ref('/satellite_updated').once('value').then(function(snapshot){
    if(getDateDifference(snapshot.value(), currentDate) >= 14 || typeof satellite_update === 'undefined'){
      db.ref('/').update({'satellite_updated' : currentDate}).then(function(snapshot){
        addData();
      }, function(error){
        
      });
    }
  }, function(error){
  });
}

function addData(){
  
}

function getDateDifference(satellite_updated, currentDate){
  var ONEDAY = 1000 * 60 * 60 * 24;
  var date1_ms = satellite_updated.getTime();
  var date2_ms = currentDate.getTime();
  var difference_ms = Math.abs(date1_ms - date2_ms);
  return difference_ms;
}