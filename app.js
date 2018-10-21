const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const log = require('./logger');
const http = require('http');
const app = express();
const venueRouter = require('./routes/venueRoutes');
const socketConnection = require('./controllers/socketConnection');

//kick off the socket.io connection
const io = socketConnection.getSocketConn(app);


/************************* database connection ********************************/
const mongoose = require('mongoose');
const mongodb = 'mongodb://simonrumi:8wxou2DQg2ko@ds239682.mlab.com:39682/queue_manager';
mongoose.connect(mongodb, {useNewUrlParser: true});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', function() {
	console.error.bind(console, 'MongoDB connection error: ');
	db.close();
	//wait 500ms and try connecting again
	setTimeout(function(db) {
		mongoose.connect(mongodb, {useNewUrlParser: true});
		mongoose.Promise = global.Promise;
		db = mongoose.connection;
	}, 500);
});


/*********************** view engine setup, etc *******************************/
//app.set('views', path.join(__dirname, 'views')); // original
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'public')]);
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this added so that we can serve /javascripts/attendeeClient.js from public/javascritps in socketio.html
app.use('/javascripts', express.static(path.join(__dirname, 'public/javascritps')));

///trying this to get to the socket.io client
app.use('/socketlib', express.static(path.join(__dirname, 'node_modules/socket.io-client/dist')));

app.use('/', venueRouter);
app.use('/venue', venueRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
