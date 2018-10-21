const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const AttendeeInQueueModel = require('../models/attendeeInQueue');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const async = require('async');
const log = require('../logger');


exports.attendeeDetailUsingSocket = function(data, resolve, reject) {
	//log('in attendeeDetailUsingSocket, got data: ' + JSON.stringify(data) + ', and got attendeeId = ' + data.attendeeId);
	let attendeeId = data.attendeeId;
	
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
			reject('error trying to render attendee details: ' + err);
			return;
		} else {
			//log('in attendeeDetailUsingSocket got results:\n' + JSON.stringify(results));
			results.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(results.attendeeInQueues, results.queues);
			resolve({data: results});
		}
	});
}


// note that actually we expect data to be null, but keeping the function signature the same as the others	
exports.attendeeCreateGet = function(data, resolve, reject) {
	log('in attendeeCreateGet');

	let newAttendee = new AttendeeModel(); // {'over21': true}
	let attendeeId;

	async.series([
			function(callback) {
				newAttendee.save(function(err, results) {
					if (err) {
						log('error trying to create a new attendee: ' + err);
						reject('error trying to create a new attendee: ' + err);
					} else {
						log('success: uploaded a new attendee, got results: ' + JSON.stringify(results));
						attendeeId = results._id;
						callback(null, {data: results});
					}
				});
			},
			function(callback) {
				log('starting async.parallel after running newAttendee.save');
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
				},
				function(err, results) {
					log('attendeeCreateGet.async.parallel() results = \n' + JSON.stringify(results));
					if(err) {
						log('Error in attendeeCreateGet: ' + err);
						reject('Error in attendeeCreateGet: ' + err);
						return;
					} else {
						callback(null, results);
					}
				});
			},
		], function(err, results) {
			log('attendeeCreateGet.async.series() results = \n' + JSON.stringify(results));
			if(err) {
				reject('Error in attendeeCreateGet: ' + err);
				return;
			} else {
				let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
				finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);
				log('at end of attendeeCreateGet, finalResults = \n' + JSON.stringify(finalResults));
				resolve({data: finalResults});
		}
	});
	
}