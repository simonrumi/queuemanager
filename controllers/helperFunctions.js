exports.getQueuesAttendeeIsNotIn = function(attendeeInQueueArr, queueArr) {
	let queuesAttendeeIsNotIn = queueArr.slice();
	for (let j in attendeeInQueueArr) { // TODO make this a recursive loop instead of a for loop
		queuesAttendeeIsNotIn = queuesAttendeeIsNotIn.filter(function(queue) {
			return attendeeInQueueArr[j].queue._id != queue.id;
		});
	}
	return queuesAttendeeIsNotIn;
}