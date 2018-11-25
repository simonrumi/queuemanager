const AttendeeInQueueModel = require('../models/attendeeInQueue');
const async = require('async');
const log = require('../logger');

exports.getQueuesAttendeeIsNotIn = function(attendeeInQueueArr, queueArr) {
	let queuesAttendeeIsNotIn;

	if (!attendeeInQueueArr || attendeeInQueueArr.length == 0) {
		// the attendeeInQueueArr is empty which means that attendee is in no queues, so just return the whole queueArr
		queuesAttendeeIsNotIn = queueArr.slice();
	} else {
		// this is hard to follow...need to note the form of the 2 array functions are:
		// filter(filterFn, objectToUseAs_this_WithinFilterFn)
		// reduce(reduceFn(accumulator, currentValueFromArray), initialValue)
		queuesAttendeeIsNotIn = queueArr.filter(function(queue) {
			//log('\nwithin queueArr.filter, queue.attractionName is: ' + queue.attractionName);
			 let attendeeIsInCurrentQueue = this.reduce(function(result, attendeeInQueue) {
				 // note that the following return value will return true if either
				 // (a) we already have a true from a previous iteration
				 // OR
				 // (b) attendeeInQueue is a match for the current queue (indicating the attendee is in the current queue)
				 return result || (attendeeInQueue.queue._id == queue.id);
			}, false);
			//log('back in queueArr.filter we get attendeeIsInCurrentQueue = ' + attendeeIsInCurrentQueue);
			// we only want to keep queues that the attendee is not in
			return !attendeeIsInCurrentQueue;
		}, attendeeInQueueArr);
	}
	//log('\ngetQueuesAttendeeIsNotIn is returning\n' + JSON.stringify(queuesAttendeeIsNotIn));
	return queuesAttendeeIsNotIn;
}


/*
* addQueueLengthsToAttendeeDetailResults()
*
* queueLengths will look like this
*  [{
*   "queueId": "5b955e0779162e4850cca443",
*   "attractionName": "PiratesoftheCaribbean",
*   "queueLength": 13
*  }, {
*   "queueId": "5b955db0b9d438472078dbf9",
*   "attractionName": "HauntedHouse",
*   "queueLength": 13
*  }, {
*   "queueId": "5b955e67cfa5211360c42f6f",
*   "attractionName": "SpaceMountain",
*   "queueLength": 25
*  }]
*
* attendeeDetailResults contains queuesAttendeeIsNotIn like this:
* {
* ...
*  "queuesAttendeeIsNotIn": [{
*		 "_id": "5b955db0b9d438472078dbf9",
*		 "attractionName": "Haunted House",
*		 "__v": 0
*  }, {
*		 "_id": "5b955e0779162e4850cca443",
*		 "attractionName": "Pirates of the Caribbean",
*		 "__v": 0
*  }]
* ...
* }
*/
exports.addQueueLengthsToAttendeeDetailResults = function(attendeeDetailResults, queueLengths) {
	//log('attendeeDetailResults.queuesAttendeeIsNotIn:\n ' + JSON.stringify(attendeeDetailResults.queuesAttendeeIsNotIn) + '\n');
	//log('queueLengths:\n ' + JSON.stringify(queueLengths) + '\n');

	const updatedQueuesAttendeeIsNotIn = attendeeDetailResults.queuesAttendeeIsNotIn.map((queue) => {
		//log('\nstarted map, queue is\n' + JSON.stringify(queue));

		//now get the queueLength for that queue
		let queueLengthIsInHere = queueLengths.reduce(function(result, queueLengthObj) {
			//log('   in reduce(), queue._id = ' + queue._id + ' queueLengthObj.queueId = ' + queueLengthObj.queueId);
			if (queue._id == queueLengthObj.queueId) {
				return queueLengthObj;
			} else {
				return result;
			}
		});
		let queueLength = queueLengthIsInHere.queueLength;
		//log('\n got queueLength = ' + queueLength);

		//make a copy of the queue object, then add the queueLength
		// note that inside this map function, queue is not just the object we expect - it has a lot of other properties,
		// and the original object we're interested in is stored within it, in a sub-object called _doc
		let newQueueObj = {...queue._doc};
		newQueueObj['queueLength'] = queueLength;
		newQueueObj['url'] = queue.url; // for some bizarre reason we lose the url property, so putting it back

		//log(' at end of map, returning newQueueObj:\n ' + JSON.stringify(newQueueObj) + '\n');
		return newQueueObj;
	});

	//log(' now we have updatedQueuesAttendeeIsNotIn:\n ' + JSON.stringify(updatedQueuesAttendeeIsNotIn) + '\n');
	attendeeDetailResults.queuesAttendeeIsNotIn = updatedQueuesAttendeeIsNotIn;
	return attendeeDetailResults;
}

// takes an array of words and concatenates them
exports.glueWordsTogether = function (words, roomName) {
	if (!roomName) {
		roomName = '';
	}
	if (words.length > 0) {
		let wordsLeft = words.slice();
		let nextWord = wordsLeft.pop();
		if (words.length == 1) {
			return nextWord + roomName;
		} else {
			return this.glueWordsTogether(wordsLeft, (nextWord + roomName));
		}
	} else {
		// shouldn't really have this case where words.length == 0
		// but just in case
		return roomName;
	}
}

//the queueChangeUrl comes from the client when an attendee joins or leaves a queue
exports.getQueueIdFromQueueChangeUrl = function (queueChangeUrl) {
	// queueChangeUrl looks something like this
	// 'http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/removeAttendee/:5b95ddf5af21a2333ceb4795'
	return queueChangeUrl.match(/queue\/:([^\/]*)/)[1];
}

exports.getAttendeeIdFromQueueChangeUrl = function (queueChangeUrl) {
	// queueChangeUrl looks something like this
	// 'http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/removeAttendee/:5b95ddf5af21a2333ceb4795'
	// or this
	// 'http://localhost:3000/venue/queue/:5b955db0b9d438472078dbf9/addAttendee/:5b95ddf5af21a2333ceb4795'
	let attendeeIdMatchArr = queueChangeUrl.match(/addAttendee\/:([^\/]*)/);
	if (!attendeeIdMatchArr) {
		attendeeIdMatchArr = queueChangeUrl.match(/removeAttendee\/:([^\/]*)/);
	}
	return attendeeIdMatchArr[1];
}

exports.getNumberOfAttendeesInEachQueue = function(queues) {
	let queueLengthsPromise = new Promise((resolve, reject) => {
		let queueLengths = [];
		async.eachOf(queues, (queue, index, callback) => {
			let currQueueId = queue._id;
			AttendeeInQueueModel.where({'queue': currQueueId}).countDocuments((err, count) => {
				if (err) {
					log('error counting attendees in queue for ' + currAttractionName);
					callback(err);
				} else {
					//log('about to add to queueLengths:\n queueId: ' + currQueueId + ' attractionName: ' + currAttractionNameWithoutSpaces + ' queueLength: ' + count);
					queueLengths.push({
						queueId: currQueueId,
						//attractionName: currAttractionNameWithoutSpaces,
						queueLength: count,
					});
					callback(null);
				}
			});
		}, function(err) {
			//log('getNumberOfAttendeesInEachQueue returning queueLengths:\n' + JSON.stringify(queueLengths));
			if(err) {
				reject(err);
			}
			resolve(queueLengths)
		});
	});
	return queueLengthsPromise;
}
