var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { 
  	title: 'Queue Manager', 
  	someSentence: 'this is from routes/index.js ...might want to have this page come from venue.js instead' 
  });
});

module.exports = router;
