const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const log = require('./logger');
const http = require('http');
const app = express();
const venueRouter = require('./routes/venueRoutes');
const attendeeInQueueControllerUsingSocket = require('./controllers/attendeeInQueueControllerUsingSocket');

/***************************** pug stuff **************************************/
const pug = require('pug');

// Compile the source code
const attendeeViewRenderer = pug.compileFile('views/attendeeSubView.pug');


/************************** socket-io setup ***********************************/
log('about to create a server then io');
const server = http.Server(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 80;
server.listen(port, function() {
	log('server listening on port ' + port);
});

io.on('connect', function(socket) {
	log('a user connected');

	socket.on('joinQueue', function(data, socket) {
		log('an attendee wants to join a queue; data given is: ' + data);
		attendeeInQueueControllerUsingSocket.addAttendeeToQueueUsingSocket(data, function(joinQueueResponse) {
			//log('returned to app.js after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
			// Render the Pug template for attendeeView, using the data we just got, then send it to the client
			let renderedAttendeeView = attendeeViewRenderer(joinQueueResponse);
			io.emit('joinQueueResponse', renderedAttendeeView);
		}, function(err) {
			//log('returned to app.js with an error after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
			io.emit('joinQueueResponse', JSON.stringify(err));
		});
	});

	socket.on('leaveQueue', function(data, socket) {
		log('an attendee wants to leave a queue; data given is: ' + data);
		attendeeInQueueControllerUsingSocket.removeAttendeeFromQueueUsingSocket(data, function(leaveQueueResponse) {
			//log('\n returned to app.js after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
			// Render the Pug template for attendeeView, using the data we just got, then send it to the client
			let renderedAttendeeView = attendeeViewRenderer(leaveQueueResponse);
			io.emit('leaveQueueResponse', renderedAttendeeView);
		}, function(err) {
			//log('\n returned to app.js with an error after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
			io.emit('leaveQueueResponse', JSON.stringify(err));
		});
	});

	socket.on('disconnect', function(){
		log('the user disconnected');
	})
});


/************************* database connection ********************************/
const mongoose = require('mongoose');
const mongodb = 'mongodb://simonrumi:8wxou2DQg2ko@ds239682.mlab.com:39682/queue_manager';
mongoose.connect(mongodb, {useNewUrlParser: true});
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error: '));


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
