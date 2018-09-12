var QueueModel = require('../models/queueModel');
var AttendeeModel = require('../models/attendeeModel');
var async = require('async');

console.log('in queueController, required models/queueModel & models/attendeeModel');

exports.index = function(req, res) {
	console.log('queue.js: in index');
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
	console.log('in queueList');

	QueueModel.find({}, function(err, documents) {
		if (err) {
			console.log('in queueList, got an error');
			res.send('had an error when listing queues: ' + err);
		} else {
			console.log('in queueList, about to render the queueList');
			res.render('queuesView', {title: 'Queue List', queueList: documents});
		}
	});
};

exports.queueDetail = function(req, res) {
	console.log('in queueDetail');
	var queueId = req.params.id;
	queueId = queueId.replace(':', ''); // strip out leading colon if it is there
	QueueModel.findById(queueId, function(err, documents) {
		res.render('queueView', {queue: documents});
	});
	//res.send('Not implemented: queueDetail. Here is what is in the req<br>' + req.params.id);
};

// show a form to create a queue
exports.queueCreateGet = function(req, res) {
	console.log('in queueCreateGet');

	/***** code for adding a single item 
	var oneTestQueue = new QueueModel({'attractionName': 'Space Maountain'});
	oneTestQueue.save(function(err) {
		if (err) {
			console.log('error trying to upload oneTestQueue: ' + err);
			res.send('error trying to upload oneTestQueue: ' + err);
		} else {
			console.log('success: uploaded oneTestQueue');
			res.send('success: uploaded oneTestQueue');
		}
	});
	*/
	
	res.send('Not implemented: queueCreateGet');
};


// create a queue on post
exports.queueCreatePost  = function(req, res) {
	console.log('in queueCreatePost');
	res.send('Not implemented: queueCreatePost');
};