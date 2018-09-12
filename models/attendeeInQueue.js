const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendeeInQueueSchema = new Schema({
	attendee: {type: Schema.Types.ObjectId, ref: 'Attendee', required: true},
	queue: {type: Schema.Types.ObjectId, ref: 'Queue', required: true},
	timeJoined: {type: Date, required: true},
});
	
AttendeeInQueueSchema.virtual('url').get(function() {
	return '/venue/queue/:' + this._id;
});

var AttendeeInQueue = mongoose.model('AttendeeInQueue', AttendeeInQueueSchema);
module.exports = AttendeeInQueue;