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
			AttendeeInQueueModel.find({'attendee': attendeeId}).populate('queue').exec(callback);
		},
	}, function(err, results) {
		if (err) {
			res.render('attendeeView', {title: 'Attendee Error Page', error: err});
		} else {
			results.queuesAttendeeIsNotIn = getQueuesAttendeeIsNotIn(results.attendeeInQueues, results.queues);
			log('results.queuesAttendeeIsNotIn = ' + JSON.stringify(results.queuesAttendeeIsNotIn));
			res.render('attendeeView', {title: 'Attendee Page', error: err, data: results});
		}
	});

	const getQueuesAttendeeIsNotIn = function(attendeeInQueueArr, queueArr) {
		let queuesAttendeeIsNotIn = queueArr.slice();
		for (let j in attendeeInQueueArr) { // TODO make this a recursive loop instead of a for loop
			queuesAttendeeIsNotIn = queuesAttendeeIsNotIn.filter(function(queue) {
				return attendeeInQueueArr[j].queue._id != queue.id;
			});
		}
		return queuesAttendeeIsNotIn;
	}
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