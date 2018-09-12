const AttendeeInQueueModel = require('../models/attendeeInQueue');

console.log('in attendeeController, required models/attendeeInQueue');

exports.addAttendeeToQueue = function(req, res) {
	// getting a url like this
	// venue/queue/:[queue id]/addAtendee/:[attendee id]
	let queueId = req.params.queueid;
	let attendeeId = req.params.attendeeid;
	queueId = queueId.replace(':', ''); // strip out leading colon if it is there
	attendeeId = attendeeId.replace(':', ''); // strip out leading colon if it is there
	
	// only add the attendee to the queue if (s)he is not already in it
	AttendeeInQueueModel.find({'attendee': attendeeId, 'queue': queueId}, function(err, results) {
		if (err) {
			res.send('error trying to search the AttendeeInQueue table: ' + err);
		} else {
			console.log('search for the attendee ' + attendeeId + ' in queue ' + queueId + ' returned ' + JSON.stringify(results));
			
			// check to see that the results of the search (AttendeeInQueueModel.find() above) has returned nothing, 
			//which means the attendee is not already in the queue 
			if (!results || 
				(results.constructor === Array && results.length === 0) || 
				(results.constructor === Object && Object.keys(results).length === 0)) {

				let oneAttendeeInQueue = new AttendeeInQueueModel({'attendee': attendeeId, 'queue': queueId, 'timeJoined': new Date()}); 
				oneAttendeeInQueue.save(function(err) {
					if (err) {
						console.log('error trying to upload oneAttendeeInQueue: ' + err);
						res.send('error trying to upload oneAttendeeInQueue: ' + err);
					} else {
						console.log('success: uploaded oneAttendeeInQueue');
						res.send('success: uploaded oneAttendeeInQueue');
					}
				
				});
			} else {
				res.send('attendee ' + attendeeId + ' was already in the queue ' + queueId + ', so did nothing');
			}
		}
			
	});
}
