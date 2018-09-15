{"filter":false,"title":"app.js","tooltip":"/app.js","undoManager":{"mark":1,"position":1,"stack":[[{"start":{"row":0,"column":0},"end":{"row":45,"column":3},"action":"insert","lines":["var express      = require('express'),","    app          = express(),","    session      = require('express-session'),","    admin        = require(\"firebase-admin\"),","    bodyParser   = require(\"body-parser\");","    ","//0Configurations-------------------------------------------------------------->","app.use(bodyParser.urlencoded({extended : true}));","app.use(express.static(__dirname));","app.use(express.static(__dirname + '/public'));","app.set('view engine', 'ejs');","","app.use(session({","    cookieName: 'session',","    secret: \"Secret Louis\",","    resave: false,","    saveUninitialized: false,","    duration: 30 * 60 * 1000,","    activeDuration: 5 * 60 * 1000,","    secure : true","}));","","var serviceAccount = require(\"./private/globeweaver-e257f-firebase-adminsdk-2473q-9373994e8d.json\");","","admin.initializeApp({","  credential: admin.credential.cert(serviceAccount),","  databaseURL: \"https://globeweaver-e257f.firebaseio.com\"","});","","//0Middleware------------------------------------------------------------------>","","//0Routes---------------------------------------------------------------------->","var indexRoute = require('./routes/index');","","app.use(indexRoute);","","var http = require(\"http\");","","// setInterval(function() {","//     http.get(\"http://m3sh.herokuapp.com/\");","//     console.log(\"pinged\");","// }, 30000); ","","app.listen(process.env.PORT, process.env.IP, function(){","    console.log(\"Server Started!\");","});"],"id":1}],[{"start":{"row":39,"column":17},"end":{"row":39,"column":43},"action":"remove","lines":["http://m3sh.herokuapp.com/"],"id":2}]]},"ace":{"folds":[],"scrolltop":357,"scrollleft":0,"selection":{"start":{"row":39,"column":17},"end":{"row":39,"column":17},"isBackwards":false},"options":{"guessTabSize":true,"useWrapMode":false,"wrapToView":true},"firstLineState":0},"timestamp":1536983145815,"hash":"4ab261f7f9e082dd58c4cb8d6b638bef66cecceb"}