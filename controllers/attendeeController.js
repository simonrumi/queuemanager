const AttendeeModel = require('../models/attendeeModel');
const QueueModel = require('../models/queueModel');
const AttendeeInQueueModel = require('../models/attendeeInQueue');
const async = require('async');
const log = require('../logger');

log('in attendeeController, required models/attendeemodel, models/queueModel, models/attendeeInQueue');

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
	//res.send('not implemented: attendeeList');
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
			AttendeeInQueueModel.find({'attendee': attendeeId}, callback);
		},
	}, function(err, results) {
		if (err) {
			res.render('attendeeView', {title: 'Attendee Error Page', error: err});
		} else {
			let attendeeInQueueArr = results.attendeeInQueues;
			let queueArr = results.queues;
			let queuesAttendeeIsNotIn = [];
			for (let i in attendeeInQueueArr) {
				let queueId = attendeeInQueueArr[i].queue;
				for (let j in queueArr) {
					if (JSON.stringify(queueArr[j]._id) == JSON.stringify(queueId)) { // using JSON.stringify to make sure we're comparing the same type
						log('attendee is in queue ' + JSON.stringify(queueArr[j]) + ' so adding name of queue to  the attendeeInQueue array');
						// put the attraction name into the attendeeInQueue sub-object 
						attendeeInQueueArr[i].attractionName = queueArr[j].attractionName;
					} else {
						let isInArray = queuesAttendeeIsNotIn && queuesAttendeeIsNotIn.find(function(element) {
							return element == queueArr[j];
						});
						if (!isInArray) {
							log('adding ' + JSON.stringify(queueArr[j]) + ' to queuesAttendeeIsNotIn');
							queuesAttendeeIsNotIn.push(queueArr[j]);
						}
					}
				}
			}
			results.queuesAttendeeIsNotIn = queuesAttendeeIsNotIn;
			res.render('attendeeView', {title: 'Attendee Page', error: err, data: results});
		}
	});

	//res.send('not implemented: attendeeDetail');
}

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
	*/
	res.send('not implemented: attendeeCreateGet');
}

exports.attendeeCreatePost = function(req, res) {
	log('in attendeeCreatePost');
	res.send('not implemented: attendeeCreatePost');
}