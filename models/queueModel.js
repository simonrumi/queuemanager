const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QueueSchema = new Schema({
	attractionName: {type: String, required: true},
	mustBeOver21: {type: Boolean}
});

// a virtual for the url to view the queue
QueueSchema.virtual('url').get(function() {
	return '/venue/queue/:' + this._id;
});

var Queue = mongoose.model('Queue', QueueSchema);
module.exports = Queue;