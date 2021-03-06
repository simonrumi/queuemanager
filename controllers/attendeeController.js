const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const AttendeeInQueueModel = require('../models/attendeeInQueue');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const async = require('async');
const log = require('../logger');

log('in attendeeController, required models/attendeemodel, models/queueModel, models/attendeeInQueue');

exports.index = function(req, res) {
	// this will cause public/javascripts/attendeeClient.js to load
	// which will emit either clientFoundKnownAttendee or clientFoundUnknownAttendee
	// which will be heard by socketConnection.js
	// which renders the attendeeSubView
	// which contains all the info about queues the attendee is in
	res.render('attendeeView', {title: ''});
}


exports.attendeeList = function(req, res) {
	log('in attendeeList');
	AttendeeModel.find({}, function(err, documents) {
		if (err) {
			log('in attendeeList, got an error');
			res.send('had an error when listing queues: ' + err);
		} else {
			log('in attendeeList, about to render the attendeeList');
			res.render('attendeesView', {title: 'Attendee List', attendeeList: documents});
		}
	});
};


exports.attendeeDetail = function(req, res) {
	log('in attendeeDetail');
	let attendeeId = req.params.id;
	attendeeId = attendeeId.replace(':', ''); // strip out leading colon if it is there

	async.parallel({
		queues: function(callback) {
			QueueModel.find({}, callback);
		},
		attendee: function(callback) {
			AttendeeModel.findById(attendeeId, callback);
		},
		attendeeInQueues: function(callback) {
			AttendeeInQueueModel.find({'attendee': attendeeId}).populate('queue').exec(callback);
		},
	}, function(err, results) {
		if (err) {
			log('Error getting attendee details: ' + err);
			res.render('attendeeView', {title: 'Attendee Error Page', error: err});
			return;
		} else {
			results.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(results.attendeeInQueues, results.queues);
			res.cookie('attendeeId', attendeeId, {maxAge : (90*24*60*60*1000)});
			res.render('attendeeView', {title: 'Attendee Page', error: err, data: results});
		}
	});
}


/*
exports.attendeeCreateGet = function(req, res) {
	log('in attendeeCreateGet');

	/***** code for adding a single item
	var oneTestAttendee = new AttendeeModel(); // {'over21': true}
	oneTestAttendee.save(function(err) {
		if (err) {
			log('error trying to upload oneTestAttendee: ' + err);
			res.send('error trying to upload oneTestAttendee: ' + err);
		} else {
			log('success: uploaded oneTestAttendee');
			res.send('success: uploaded oneTestAttendee');
		}
	});

	res.send('not implemented: attendeeCreateGet');
}
*/

exports.attendeeCreatePost = function(req, res) {
	log('in attendeeCreatePost');
	res.send('not implemented: attendeeCreatePost');
}
