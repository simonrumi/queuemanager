let socketIoConnection;

const main = function() {
	// set up a socket.io connection
	socketIoConnection = initSocketConnection();
	let attendeeId = recoverAttendeeId();
	if (attendeeId) {
		socketIoConnection.emit('clientFoundKnownAttendee', {'attendeeId': attendeeId});
	} else {
		socketIoConnection.emit('clientFoundUnknownAttendee', {});
	}
}

const initSocketConnection = function() {
	//const socket = io();
	const socketLocation = window.location.protocol + '//' + window.location.hostname;
	console.log('socketLocation = ' + socketLocation);
	const socket = io(socketLocation);

	socket.on('connect', function() {
		console.log('socket io connected');
	});

	socket.on('joinQueueResponse', function(data) {
		//console.log('socket io got a joinQueueResponse with data: ' + JSON.stringify(data));
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('leaveQueueResponse', function(data) {
		//console.log('socket io got a leaveQueueResponse with data: ' + JSON.stringify(data));
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('knownAttendeeResponse', function(data) {
		//console.log('socket io got a leaveQueueResponse with data: ' + JSON.stringify(data));
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('unknownAttendeeResponse', function(data) {
		//console.log('socket io got a leaveQueueResponse with data: ' + JSON.stringify(data));
		//a new attendee is created
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
		//need to set the cookie with the new attendee id
		setAttendeeCookie();
	});

	socket.on('queueUpdated', function(data) {
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('disconnect', function(){
		console.log('socket io disconnected');
	});

	return socket;
}

const recoverAttendeeId = function() {
	if (document.cookie) {
		console.log('cookie already on the page is ' + document.cookie);
		let attendeeId = document.cookie.match(/attendeeId=(.[^;]*)/i)[1];
		return attendeeId;
	} else {
		//set a cookie on the page using the attendee id from the mongo db (which mihght be on the page)
		return false;
	}
}

//send message to server to have the attendee either join or leave a queue
const handleQueueChange = function(event) {
	let queueChangeUrl = window.location.origin + event.target.dataset.queueChangeUrl;
	let queueChangeType = event.target.dataset.queueChangeType + 'Queue'; // makes the string 'joinQueue' or 'leaveQueue'
	socketIoConnection.emit(queueChangeType, queueChangeUrl);

	console.log('queueChangeUrl = ' + queueChangeUrl);
}

const setAttendeeCookie = function() {
		const attendeeInfoDiv = document.querySelector('#attendee-info');
		let attendeeId;
		if (attendeeInfoDiv) {
			attendeeId = attendeeInfoDiv.dataset.attendeeid || 'no attendee-info tag';
			document.cookie = "attendeeId=" + attendeeId;
			console.log('setAttendeeCookie: attendeeId=' + attendeeId);
		}

};

document.addEventListener('DOMContentLoaded', main);
