const AttendeeInQueueModel = require('../models/attendeeInQueue');
const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const async = require('async');
const log = require('../logger');

log('in attendeeController, required models/attendeeInQueue');

exports.updateQueuePlaces = function(data, resolve, reject) {
	// data contains something like this
	// http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/removeAttendee/:5b95ddf5af21a2333ceb4795
	let queueId = data.match(/queue\/:([^\/]*)/)[1];
	let attendeeId = data.match(/removeAttendee\/:([^\/]*)/)[1];

	AttendeeInQueueModel.find({'queue': queueId}).sort({timeJoined: 'ascending'}).exec(function(err, attendeesInOneQueue) {
		if (err) {
			log('updateQueuePlaces: error trying to find the queue with queueId ' + data.queueId  + ' : ' + err);
			reject('updateQueuePlaces: error trying to find the queue with queueId ' + data.queueId  + ' : ' + err);
			return;
		} else {
			var resultsList = {'errors': [], 'successes': [], 'noUpdatesNeeded': []};
			//log('updateQueuePlaces, got results ' + JSON.stringify(results));
			//update all the placeInQueue values for all the attendees in the queue that need it
			// by going through the list of attendeesInOneQueue, which is in order, and make sure their placeInQueue is matching the position in the list of attendeesInOneQueue
			async.eachOf(attendeesInOneQueue, function(item, index, callback) {
				if (item.placeInQueue && item.placeInQueue == index+1) {
					//log('\nplaceInQueue at index ' + index + ' is already correct:\n' + JSON.stringify(item));
					resultsList.noUpdatesNeeded.push(index + 1);
				} else {
					//log('\nplaceInQueue at index ' + index + ' needs to be updated for item:\n' + JSON.stringify(item));
					AttendeeInQueueModel.update({'attendee': item.attendee, 'queue': queueId}, {placeInQueue: index+1}, function(err, data) {
						if (err) {
							//log('\nWARNING: could not update placeInQueue to : ' + (index + 1) + ' : ' + err);
							resultsList.errors.push('WARNING: could not update placeInQueue to : ' + (index + 1) + ' : ' + err);
						} else {
							//log('\nSuccess: updated placeInQueue to ' + index+1);
							resultsList.successes.push(index + 1);
						}
					});
				}
				callback();
				return;
			}, function(err, results) {
				if (err) {
					//log('\nError in updateQueuePlaces: ' + JSON.stringify(err));
					reject('\nError in updateQueuePlaces: ' + JSON.stringify(err));
					return;
				} else {
					//log('\nupdateQueuePlaces, resolving with resultsList:\n' + JSON.stringify(resultsList) + '\n');
					resolve(resultsList);
					return;
				}
			});
		}
	});
}

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
					return;
				} else {
					//log('\n search for the attendee ' + attendeeId + ' in queue ' + queueId + ' returned ' + JSON.stringify(results) + '\n');

					// check to see that the results of the search (AttendeeInQueueModel.find() above) has returned nothing,
					//which means the attendee is not already in the queue
					if (!results ||
						(results.constructor === Array && results.length === 0) ||
						(results.constructor === Object && Object.keys(results).length === 0)) {

						// the attendee's place in the queue is going to be the current length of the queue + 1
						AttendeeInQueueModel.where({'queue': queueId}).countDocuments(function(err, count) {
							log('\n Count of attendees in queue with the id ' + queueId + ' == ' + count + '\n');
							if (err) {
								log('\nError getting count of attendees in queue with id ' + queueId + ' :\n' + err);
								reject('\nError getting count of attendees in queue with id ' + queueId + ' :\n' + err);
							} else {
								const newAttendeePlaceInQueue = count + 1;
								let oneAttendeeInQueue = new AttendeeInQueueModel({
									'attendee': attendeeId,
									'queue': queueId,
									'timeJoined': new Date(),
									'placeInQueue': newAttendeePlaceInQueue,
								});
								oneAttendeeInQueue.save(function(err) {
									if (err) {
										log('error trying to upload oneAttendeeInQueue: ' + err);
										reject('error trying to upload oneAttendeeInQueue: ' + err);
										return;
									} else {
										log('\nsuccess: uploaded oneAttendeeInQueue');
										//log('...and results = \n' + JSON.stringify(results) + '\n');
										callback(null, results);
									}
								});
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
		}, function(callback) {
			//having got attendeeInQueues we need to find out the attendee's place in the queue (s)he just joined
			let placeInQueue = 0;
			let placeInQueueResults = {};
			let i;
			AttendeeInQueueModel.find({'queue': queueId}).sort({timeJoined: 'ascending'}).exec(function(err, results) {
				if (err) {
					reject('Error trying to get all the queues attendee is in: ' + err);
					return;
				} else {
					// this returns a list of attendees in a single queue, ordered by the time each attendee joined the queue
					//log('\naddAttendeeToQueue found queues with the id ' + queueId + ':\n' + results + '\n');
					for (i in results) {
						placeInQueue++;
						if (results[i].attendee == attendeeId) {
							results.placeInQueue = placeInQueue;
							//log('got placeInQueue = ' + placeInQueue + '\n results are now: \n' + JSON.stringify(results) + '\n');
							break;
						}
					}
					placeInQueueResults = {'placeInQueue': placeInQueue}
					callback(null, placeInQueueResults);
				}
			});
		}], function(err, results) {
			//log('addAttendeeToQueueUsingSocket.async.series() results = \n' + JSON.stringify(results) + '\n');
			if(err) {
				reject('Error in addAttendeeToQueueUsingSocket: ' + err);
			} else {
				let finalResults = results[1]; // results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
				finalResults.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(finalResults.attendeeInQueues, finalResults.queues);
				//log('\naddAttendeeToQueueUsingSocket: finalResults = ' + JSON.stringify(finalResults) +'\n');
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
