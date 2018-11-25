const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const AttendeeInQueueModel = require('../models/attendeeInQueue');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const addQueueLengthsToAttendeeDetailResults = HelperFunctions.addQueueLengthsToAttendeeDetailResults;
const async = require('async');
const log = require('../logger');

exports.attendeeDetailUsingSocket = function(data, resolve, reject) {
	//log('in attendeeDetailUsingSocket, got data: ' + JSON.stringify(data) + ', and got attendeeId = ' + data.attendeeId);
	let attendeeId = data.attendeeId;

	// get the data for the queues, the attendee, and the list of queues the attendee is in
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
	// callback for async.parallel
	function(err, results) {
		if (err) {
			log('Error getting attendee details: ' + err);
			reject('error trying to render attendee details: ' + err);
			return;
		} else {
			//log('in attendeeDetailUsingSocket got results after async.parallel:\n' + JSON.stringify(results));

			let queueLengthsPromise =	HelperFunctions.getNumberOfAttendeesInEachQueue(results.queues);
			queueLengthsPromise.then((queueLengthsArr) => {
				//log('\nHelperFunctions.getNumberOfAttendeesInEachQueue returned queueLengthsArr\n' + JSON.stringify(queueLengthsArr));

				let resultsWithQueuesAttendeeIsNotIn = {...results};
				resultsWithQueuesAttendeeIsNotIn.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(results.attendeeInQueues, results.queues);
				completeResults = addQueueLengthsToAttendeeDetailResults(resultsWithQueuesAttendeeIsNotIn, queueLengthsArr);

				//log('\n in queueLengthsPromise, completeResults are:\n' + JSON.stringify(completeResults));
				resolve({data: completeResults});
			}).catch((err) => {
				log('\nHelperFunctions.getNumberOfAttendeesInEachQueue returned an error\n' + err);
				reject(err);
			});
		}
	});
}

// note that actually we expect data to be null, but keeping the function signature the same as the others
exports.attendeeCreateGet = function(data, resolve, reject) {
	log('in attendeeCreateGet');

	let newAttendee = new AttendeeModel(); // {'over21': true}
	let attendeeId;

	async.series([
		// series item 1
		function(callback) {
			newAttendee.save(function(err, results) {
				if (err) {
					log('error trying to create a new attendee: ' + err);
					reject('error trying to create a new attendee: ' + err);
				} else {
					log('\nsuccess: uploaded a new attendee, got results: ' + JSON.stringify(results));
					attendeeId = results._id;
					callback(null, {data: results});
				}
			});
		},
		// series item 2
		function(callback) {
			//log('\nstarting async.parallel after running newAttendee.save, attendeeId is ' + attendeeId);
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
				//log('attendeeCreateGet.async.parallel() results = \n' + JSON.stringify(results));
				if(err) {
					log('Error in attendeeCreateGet: ' + err);
					reject('Error in attendeeCreateGet: ' + err);
					return;
				} else {
					callback(null, results);
				}
			});
		}],
		//callback for series
	function(err, results) {
		//log('attendeeCreateGet.async.series() results = \n' + JSON.stringify(results));

		if(err) {
			reject('Error in attendeeCreateGet: ' + err);
			return;
		} else {
			//results is an array with 2 elements, (the first containing the id of the newly saved attendee), but 2nd is the stuff we want
			let usefulResults = results[1];
			let queueLengthsPromise =	HelperFunctions.getNumberOfAttendeesInEachQueue(usefulResults.queues);
			queueLengthsPromise.then((queueLengthsArr) => {
				//log('\nHelperFunctions.getNumberOfAttendeesInEachQueue returned queueLengthsArr\n' + JSON.stringify(queueLengthsArr));

				let resultsWithQueuesAttendeeIsNotIn = {...usefulResults};
				resultsWithQueuesAttendeeIsNotIn.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(usefulResults.attendeeInQueues, usefulResults.queues);
				completeResults = addQueueLengthsToAttendeeDetailResults(resultsWithQueuesAttendeeIsNotIn, queueLengthsArr);

				//log('\n in queueLengthsPromise, completeResults are:\n' + JSON.stringify(completeResults));
				resolve({data: completeResults});
			}).catch((err) => {
				log('\nHelperFunctions.getNumberOfAttendeesInEachQueue returned an error\n' + err);
				reject(err);
			});
		}
	});
}
