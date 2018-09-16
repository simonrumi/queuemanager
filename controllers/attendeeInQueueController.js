const AttendeeInQueueModel = require('../models/attendeeInQueue');
const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const async = require('async');
const log = require('../logger');

log('in attendeeController, required models/attendeeInQueue');

exports.addAttendeeToQueue = function(req, res) {
	// getting a url like this
	// venue/queue/:[queue id]/addAtendee/:[attendee id]
	let queueId = req.params.queueid;
	let attendeeId = req.params.attendeeid;
	queueId = queueId.replace(':', ''); // strip out leading colon if it is there
	attendeeId = attendeeId.replace(':', ''); // strip out leading colon if it is there

	async.series([
		function(callback) {
			// only add the attendee to the queue if (s)he is not already in it
			AttendeeInQueueModel.find({'attendee': attendeeId, 'queue': queueId}, function(err, results) {
				log('In addAttendeeToQueue(), started the AttendeeInQueueModel.find() callback function');
				if (err) {
					res.send('error trying to search the AttendeeInQueue table: ' + err);
				} else {
					log('\n search for the attendee ' + attendeeId + ' in queue ' + queueId + ' returned ' + JSON.stringify(results) + '\n');
					
					// check to see that the results of the search (AttendeeInQueueModel.find() above) has returned nothing, 
					//which means the attendee is not already in the queue 
					if (!results || 
						(results.constructor === Array && results.length === 0) || 
						(results.constructor === Object && Object.keys(results).length === 0)) {

						let oneAttendeeInQueue = new AttendeeInQueueModel({'attendee': attendeeId, 'queue': queueId, 'timeJoined': new Date()}); 
						oneAttendeeInQueue.save(function(err) {
							if (err) {
								log('error trying to upload oneAttendeeInQueue: ' + err);
								res.render('attendeeView', {title: 'Attendee Error Page', error: err});
								return;
							} else {
								log('success: uploaded oneAttendeeInQueue');
								callback(null, results);
								//res.send('success: uploaded oneAttendeeInQueue');
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
				log('removeAttendeeFromQueue.async.parallel() results = \n' + JSON.stringify(results));
				if(err) {
					log('Error in removeAttendeeFromQueue: ' + err);
					res.render('attendeeView', {title: 'Attendee Error Page', error: err});
					return;
				} else {
					// res.render('attendeeView', {title: 'Attendee Page', error: err, data: results});
					callback(null, results);
				}
			});
		}], function(err, results) {
			log('addAttendeeToQueue.async.series() results = \n' + JSON.stringify(results));
			if(err) {
				res.render('attendeeView', {title: 'Attendee Error Page', error: err});
				return;
			} else {
				let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
				finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);

				res.render('attendeeView', {title: 'Attendee Page', error: err, data: finalResults});
			}
		}
	);	
}


exports.removeAttendeeFromQueue = function(req, res) {
	// getting a url like this
	// venue/queue/:[queue id]/removeAtendee/:[attendee id]
	log('in removeAttendeeFromQueue');
	//log(' ===> req.params = ' + JSON.stringify(req.params));
	let queueId = req.params.queueid;
	let attendeeId = req.params.attendeeid;

	// strip out leading colons if there
	queueId = queueId.replace(':', '');
	attendeeId = attendeeId.replace(':', ''); 

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
				log('removeAttendeeFromQueue.async.parallel() results = \n' + JSON.stringify(results));
				if(err) {
					log('Error in removeAttendeeFromQueue: ' + err);
					res.render('attendeeView', {title: 'Attendee Error Page', error: err});
					return;
				} else {
					// res.render('attendeeView', {title: 'Attendee Page', error: err, data: results});
					callback(null, results);
				}
			});
		},
	], function(err, results) {
		log('removeAttendeeFromQueue.async.series() results = \n' + JSON.stringify(results));
		if(err) {
			res.render('attendeeView', {title: 'Attendee Error Page', error: err});
			return;
		} else {
			let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
			finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);

			res.render('attendeeView', {title: 'Attendee Page', error: err, data: finalResults});
		}
	});
}
