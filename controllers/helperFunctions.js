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
