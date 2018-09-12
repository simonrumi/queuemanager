const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendeeSchema = new Schema({
	over21: {type: Boolean},
});

// a virtual for the url to view the attendee
AttendeeSchema.virtual('url').get(function() {
	return '/venue/attendee/:' + this._id;
});

var Attendee = mongoose.model('Attendee', AttendeeSchema);
module.exports = Attendee;