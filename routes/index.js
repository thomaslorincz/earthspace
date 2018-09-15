var express = require('express'),
    router  = express.Router(),
    admin   = require('firebase-admin');
    // graph   = require('fbgraph');

var db = admin.database();

router.get("/", function(request, response){
    response.render("../views/main/index");
});

router.get("/3d", function(request, response){
    response.render("../views/main/model");
});

module.exports = router;