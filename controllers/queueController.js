const QueueModel = require('../models/queueModel');
const AttendeeModel = require('../models/attendeeModel');
const AttendeeInQueueModel = require('../models/attendeeInQueue');
const async = require('async');
const log = require('../logger');

log('in queueController, required models/queueModel & models/attendeeModel');

exports.index = function(req, res) {
	log('queue.js: in index');
	async.parallel({
		queueCount: function(callback) {
			QueueModel.countDocuments({}, callback);
		},
		attendeeCount: function(callback) {
			AttendeeModel.countDocuments({}, callback);
		},
	}, function(err, results) {
		if (err) {
			res.render('index', {title: 'Queue Manager Error Page', error: err});
		} else {
			res.render('index', {title: 'Queue Manager Home', error: err, data: results});
		}
	});
}

exports.queueList = function(req, res, next) {
	log('in queueList');

	QueueModel.find({}, function(err, documents) {
		if (err) {
			log('in queueList, got an error');
			res.send('had an error when listing queues: ' + err);
		} else {
			log('in queueList, about to render the queueList');
			res.render('queuesView', {title: 'Queue List', queueList: documents});
		}
	});
};

exports.queueDetail = function(req, res) {
	log('in queueDetail');
	var queueId = req.params.id;
	queueId = queueId.replace(':', ''); // strip out leading colon if it is there

	async.parallel({
		queue: function(callback) {
			QueueModel.findById(queueId, callback);
		},
		attendeesInQueue: function(callback) {
			AttendeeInQueueModel.find({'queue': queueId}).populate('attendee').exec(callback);
		},
	}, function(err, results) { 
		if (err) {
			res.render('queueView', {title: 'Queue Error Page', error: err});
		} else {
			log('queueDetail, results data is:    ' + JSON.stringify(results));
			res.render('queueView', {title: 'Queue Page', error: err, data: results});
		}
	});
	//res.send('Not implemented: queueDetail. Here is what is in the req<br>' + req.params.id);
};

// show a form to create a queue
exports.queueCreateGet = function(req, res) {
	log('in queueCreateGet');

	/***** code for adding a single item 
	var oneTestQueue = new QueueModel({'attractionName': 'Space Maountain'});
	oneTestQueue.save(function(err) {
		if (err) {
			log('error trying to upload oneTestQueue: ' + err);
			res.send('error trying to upload oneTestQueue: ' + err);
		} else {
			log('success: uploaded oneTestQueue');
			res.send('success: uploaded oneTestQueue');
		}
	});
	*/
	
	res.send('Not implemented: queueCreateGet');
};


// create a queue on post
exports.queueCreatePost  = function(req, res) {
	log('in queueCreatePost');
	res.send('Not implemented: queueCreatePost');
};