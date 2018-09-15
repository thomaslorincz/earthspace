var express = require('express'),
    router  = express.Router(),
    admin   = require('firebase-admin');

var db = admin.database();

router.get("/", function(request, response){
    response.render("../www/index");
});

module.exports = router;