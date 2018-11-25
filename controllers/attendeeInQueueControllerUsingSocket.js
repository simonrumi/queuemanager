const AttendeeInQueueModel = require('../models/attendeeInQueue');
const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const HelperFunctions = require('./helperFunctions');
const getQueuesAttendeeIsNotIn = HelperFunctions.getQueuesAttendeeIsNotIn;
const getQueueIdFromQueueChangeUrl = HelperFunctions.getQueueIdFromQueueChangeUrl;
const getAttendeeIdFromQueueChangeUrl = HelperFunctions.getAttendeeIdFromQueueChangeUrl;
const addQueueLengthsToAttendeeDetailResults = HelperFunctions.addQueueLengthsToAttendeeDetailResults;
const async = require('async');
const log = require('../logger');

log('started attendeeController');

/**
* for general reference
* queue change data contains something like this
*	{ queueChangeUrl: 'http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/removeAttendee/:5b95ddf5af21a2333ceb4795'
*	queueName: 'soemQueueName' }
*	(url could contain addAttendee or removeAttendee)
**/

//when an attendee joins or leaves a queue, this is to update the length of the queue for all attendees not already in that queue
exports.updateQueueLength = function(data, resolve, reject) {
	let queueId = getQueueIdFromQueueChangeUrl(data.queueChangeUrl);

	AttendeeInQueueModel.where({'queue': queueId}).countDocuments(function(err, count) {
		if (err) {
			log('\nError getting count of attendees in queue with id ' + queueId + ' :\n' + err);
			reject('\nError getting count of attendees in queue with id ' + queueId + ' :\n' + err);
		} else {
			//log('\nupdateQueueLength got attractionName: ' + data.queueName + ', changedQueueLength: ' + count)
			resolve({'attractionName': data.queueName, 'changedQueueLength': count});
		}
	});
}

///when attendee A leaves a queue this is to get the updated placeInQueue values for all the attendees that were behind attendee A in the queue
exports.updateQueuePlaces = function(data, resolve, reject) {
	let queueId = getQueueIdFromQueueChangeUrl(data.queueChangeUrl);

	AttendeeInQueueModel.find({'queue': queueId}).sort({timeJoined: 'ascending'}).exec(function(err, attendeesInOneQueue) {
		if (err) {
			log('updateQueuePlaces: error trying to find the queue with queueId ' + data.queueId  + ' : ' + err);
			reject('updateQueuePlaces: error trying to find the queue with queueId ' + data.queueId  + ' : ' + err);
			return;
		} else {
			var resultsList = {'errors': [], 'changedQueuePlaces': {}, 'noUpdatesNeeded': []};

			//update all the placeInQueue values for all the attendees in the queue that need it
			// by going through the list of attendeesInOneQueue, which is in order,
			// making sure their placeInQueue is matching the position in the list of attendeesInOneQueue
			async.eachOf(attendeesInOneQueue, function(item, index, callback) {
				let oneResult = {};
				if (item.placeInQueue && item.placeInQueue == (index + 1)) {
					//log('\nplaceInQueue at index ' + index + ' is already correct:\n'); // + JSON.stringify(item));
					resultsList.noUpdatesNeeded.push(index + 1);
					//oneResult['queue' + (index + 1)] = 'noUpdateNeeded';
					callback();
				} else {
					//log('\nplaceInQueue at index ' + index + ' needs to be updated for item:\n' + JSON.stringify(item));
					AttendeeInQueueModel.update({'attendee': item.attendee, 'queue': queueId}, {placeInQueue: index+1}, function(err, data) {
						if (err) {
							//log('\nWARNING: could not update placeInQueue to : ' + (index + 1) + ' : ' + err);
							resultsList.errors.push('WARNING: could not update placeInQueue to : ' + (index + 1) + ' : ' + err);
							oneResult['queue' + (index + 1)] = err;
						} else {
							//log('\nSuccess: updated placeInQueue to ' + (index + 1));
							resultsList.changedQueuePlaces[item.attendee] = (index + 1);
							//oneResult['queue' + (index + 1)] = 'success';
						}
						callback();
					});
				}
			}, function(err, results) {
				if (err) {
					//note that we actually will never get here as any errors are added to resultsList, so see the else clause below
					reject('\nError in updateQueuePlaces: ' + JSON.stringify(err));
					return;
				} else {
					//log('\nupdateQueuePlaces, resolving with resultsList:\n' + JSON.stringify(resultsList) + '\n');
					resolve(resultsList); // note that we have to get the collected results from resultsList...results will have nothing in it
					return;
				}
			});
		}
	});
}

exports.addAttendeeToQueueUsingSocket = function(data, resolve, reject) {
	let queueId = getQueueIdFromQueueChangeUrl(data.queueChangeUrl);
	let attendeeId = getAttendeeIdFromQueueChangeUrl(data.queueChangeUrl);

	async.series([
		//first in series: add the attendee to the queue
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
							//log('\n Count of attendees in queue with the id ' + queueId + ' == ' + count + '\n');
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
		},

		// 2nd in series: get (most of) the data to update the attendee detail page
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
			// callback() for the parallel tasks immediately above
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
		},

		// 3rd in series: find out the attendee's place in the queue (s)he just joined
		function(callback) {
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
							//log('got placeInQueue = ' + placeInQueue);
							break;
						}
					}
					placeInQueueResults = {'placeInQueue': placeInQueue}
					callback(null, placeInQueueResults);
				}
			});
		}],

		// having run the series of tasks, this is the callback() that returns the results
		function(err, results) {
			//log('addAttendeeToQueueUsingSocket.async.series() results = \n' + JSON.stringify(results) + '\n');

			if(err) {
				reject('Error in addAttendeeToQueueUsingSocket: ' + err);
				return;
			} else {
				// results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
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
		}
	);
}

exports.removeAttendeeFromQueueUsingSocket = function(data, resolve, reject) {
	let queueId = getQueueIdFromQueueChangeUrl(data.queueChangeUrl);
	let attendeeId = getAttendeeIdFromQueueChangeUrl(data.queueChangeUrl);

	//log('in removeAttendeeFromQueueUsingSocket, data = ' + JSON.stringify(data));

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
			log('Error in removeAttendeeFromQueue: ' + err);
			reject('Error in removeAttendeeFromQueue: ' + err);
			return;
		} else {
			// results is an array with the first element being some stuff we don't need, but the 2nd element has what we want in it
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
				//log('\nHelperFunctions.getNumberOfAttendeesInEachQueue returned an error\n' + err);
				reject(err);
			});
		}
	});
}
