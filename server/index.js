//

var express      = require('express'),
    app          = express(),
    session      = require('express-session'),
    admin        = require("firebase-admin"),
    bodyParser   = require("body-parser"),
    satellite    = require('./public/satellite/dist/satellite.js').satellite;
    
//0Configurations-------------------------------------------------------------->
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'dist')));

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

var db = admin.database();

//0Middleware------------------------------------------------------------------>

//0Routes---------------------------------------------------------------------->
app.get('/', function(request, response){
  var satelliteArray = [];
  db.ref('/satellites').once('value').then(function(snapshot){
    var satellites = snapshot.val();
    for(var key in satellites){
      if(satellites.hasOwnProperty(key)){
        var tleArray = ['',''];
        tleArray[0] = satellites[key]['tle']['0'];
        tleArray[1] = satellites[key]['tle']['1'];
        satelliteArray.push(tleArray);
      }
    }
    response.render('../views/src/index.ejs', {satellites : satelliteArray});
    response.sendFile(path.join(__dirname, 'dist/index.html'));
  }, function(error){
  });
});

app.listen(8080, '127.0.0.1', function(){
    console.log("Server Started!");
});
