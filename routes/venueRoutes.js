const express = require('express');
const router = express.Router();
const log = require('../logger');
const socketConnection = require('../controllers/socketConnection');

//controllers
const queueController = require('../controllers/queueController');
const attendeeController = require('../controllers/attendeeController');
const attendeeControllerUsingSocket = require('../controllers/attendeeControllerUsingSocket');
const attendeeInQueueController = require('../controllers/attendeeInQueueControllerUsingSocket');
//log('in venueRoutes, required queueController, attendeeController, attendeeInQueueController');

router.get('/', attendeeController.index);

/**** Queue routes *****/
// create a queue from a form - note that this must come before routes to display a queue
router.get ('/queues/create', queueController.queueCreateGet);

//crete a queue from a POST
router.post('/queues/create', queueController.queueCreatePost);

// get a list of all queues
router.get('/queues', queueController.queueList);

// get a single queue
router.get('/queue/:id', queueController.queueDetail);


/**** Attendee routes *****/
// create an attendee from a form - note that this must come before routes to display an attendee
//router.get ('/attendees/create', attendeeController.attendeeCreateGet); // calling from socketConnection.js instead

//crete an attendee from a POST
router.post('/attendees/create', attendeeController.attendeeCreatePost);

// get a list of all attendees
router.get('/attendees', attendeeController.attendeeList);

// get a single atten
router.get('/attendee/:id', attendeeController.attendeeDetail);

// add an attendee to a queue
router.get('/queue/:queueid/addAttendee/:attendeeid', attendeeInQueueController.addAttendeeToQueueUsingSocket);

// remove an attendee from a queue
router.get('/queue/:queueid/removeAttendee/:attendeeid', attendeeInQueueController.removeAttendeeFromQueueUsingSocket);


/**** test of socket.io - remove ***/
// note that vvenueRoutes.js is in the /routes dir. so __dirname points to /routes, but we have to get to the root dir to navigate to /public
router.get('/sockettest', function(req, res) {
	log('in router.get /sockettest, __dirname = ' + __dirname);
	let regex = /[\/|\\]routes$/;
	let rootDir = __dirname.replace(regex, ''); // trim off "/routes" from the end
	log('...now rootDir = ' + rootDir);
	res.sendFile(rootDir + '/public/socketio.html');
});

module.exports = router;
