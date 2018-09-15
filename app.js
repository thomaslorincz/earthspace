var express      = require('express'),
    app          = express(),
    session      = require('express-session'),
    admin        = require("firebase-admin"),
    bodyParser   = require("body-parser");
    
//0Configurations-------------------------------------------------------------->
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.use(session({
    cookieName: 'session',
    secret: "Secret Louis",
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    secure : true
}));

var serviceAccount = require("./private/globeweaver-e257f-firebase-adminsdk-2473q-9373994e8d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://globeweaver-e257f.firebaseio.com"
});

//0Middleware------------------------------------------------------------------>

//0Routes---------------------------------------------------------------------->
var indexRoute = require('./routes/index');

app.use(indexRoute);

var http = require("http");

// setInterval(function() {
//     http.get("");
//     console.log("pinged");
// }, 30000); 

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server Started!");
});