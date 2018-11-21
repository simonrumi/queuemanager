exports.getQueuesAttendeeIsNotIn = function(attendeeInQueueArr, queueArr) {
	let queuesAttendeeIsNotIn = queueArr.slice();
	for (let j in attendeeInQueueArr) { // TODO make this a recursive loop instead of a for loop
		queuesAttendeeIsNotIn = queuesAttendeeIsNotIn.filter(function(queue) {
			return attendeeInQueueArr[j].queue._id != queue.id;
		});
	}
	return queuesAttendeeIsNotIn;
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
