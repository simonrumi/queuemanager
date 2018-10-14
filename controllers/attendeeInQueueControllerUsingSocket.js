const AttendeeInQueueModel = require('../models/attendeeInQueue');
const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const async = require('async');
const log = require('../logger');

log('in attendeeController, required models/attendeeInQueue');

exports.addAttendeeToQueueUsingSocket = function(data, resolve, reject) {
	// getting a string like this
	// "http://localhost:3000/venue/queue/:5b955e0779162e4850cca443/addAttendee/:5b95de92d3c3e74174a7777a"
	let queueId = data.match(/queue\/:([^\/]*)/)[1];
	let attendeeId = data.match(/addAttendee\/:([^\/]*)/)[1];

	async.series([
		function(callback) {
			// only add the attendee to the queue if (s)he is not already in it
			AttendeeInQueueModel.find({'attendee': attendeeId, 'queue': queueId}, function(err, results) {
				//log('In addAttendeeToQueue(), started the AttendeeInQueueModel.find() callback function');
				if (err) {
					reject('error trying to search the AttendeeInQueue table: ' + err);
				} else {
					//log('\n search for the attendee ' + attendeeId + ' in queue ' + queueId + ' returned ' + JSON.stringify(results) + '\n');

					// check to see that the results of the search (AttendeeInQueueModel.find() above) has returned nothing,
					//which means the attendee is not already in the queue
					if (!results ||
						(results.constructor === Array && results.length === 0) ||
						(results.constructor === Object && Object.keys(results).length === 0)) {

						let oneAttendeeInQueue = new AttendeeInQueueModel({'attendee': attendeeId, 'queue': queueId, 'timeJoined': new Date()});
						oneAttendeeInQueue.save(function(err) {
							if (err) {
								log('error trying to upload oneAttendeeInQueue: ' + err);
								reject('error trying to upload oneAttendeeInQueue: ' + err);
								return;
							} else {
								log('success: uploaded oneAttendeeInQueue');
								callback(null, results);
							}
						});
					} else {
						log('attendee ' + attendeeId + ' was already in the queue ' + queueId + ', so did nothing');
						callback(null, results);
					}
				}
			});
		}, function(callback) {
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
				//log('addAttendeeToQueueUsingSocket.async.parallel() results = \n' + JSON.stringify(results));
				if(err) {
					//log('Error in addAttendeeToQueueUsingSocket: ' + err);
					reject('Error in addAttendeeToQueueUsingSocket: ' + err);
					return;
				} else {
					callback(null, results);
				}
			});
		}], function(err, results) {
			//log('addAttendeeToQueueUsingSocket.async.series() results = \n' + JSON.stringify(results));
			if(err) {
				reject('Error in addAttendeeToQueueUsingSocket: ' + err);
			} else {
				let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
				//log('addAttendeeToQueueUsingSocket: finalResults = ' + JSON.stringify(finalResults));
				finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);
				resolve({data: finalResults});
			}
		}
	);
}

exports.removeAttendeeFromQueueUsingSocket = function(data, resolve, reject) {
	log('in removeAttendeeFromQueueUsingSocket, data = ' + JSON.stringify(data));

	// getting a url like this
	// http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/removeAttendee/:5b95ddf5af21a2333ceb4795
	let queueId = data.match(/queue\/:([^\/]*)/)[1];
	let attendeeId = data.match(/removeAttendee\/:([^\/]*)/)[1];

	async.series([
		function(callback) {
			AttendeeInQueueModel.deleteOne({'attendee': attendeeId, 'queue': queueId}, callback);
		},
		function(callback) {
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
				//log('removeAttendeeFromQueue.async.parallel() results = \n' + JSON.stringify(results));
				if(err) {
					log('Error in removeAttendeeFromQueue: ' + err);
					reject('Error in removeAttendeeFromQueue: ' + err);
					return;
				} else {
					callback(null, results);
				}
			});
		},
	], function(err, results) {
		//log('removeAttendeeFromQueue.async.series() results = \n' + JSON.stringify(results));
		if(err) {
			reject('Error in removeAttendeeFromQueue: ' + err);
			return;
		} else {
			let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
			finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);
			resolve({data: finalResults});
		}
	});
}
