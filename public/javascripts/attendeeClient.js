let socketIoConnection;

const recoverAttendeeId = function() {
	if (document.cookie) {
		console.log('cookie already on the page is ' + document.cookie);
	} else {
		//set a cookie on the page using the attendee id from the mongo db (which is already given to us when the page )
		setAttendeeCookie();
	}
}

const main = function() {
	// set up a socket.io connection
	socketIoConnection = initSocketConnection();
	recoverAttendeeId();
}

const initSocketConnection = function() {
	//const socket = io();
	const socketLocation = window.location.protocol + '//' + window.location.hostname;
	console.log('socketLocation = ' + socketLocation);
	const socket = io(socketLocation);

	socket.on('connect', function(){
		console.log('socket io connected');
	});

	socket.on('joinQueueResponse', function(data){
		//console.log('socket io got a joinQueueResponse with data: ' + JSON.stringify(data));
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('leaveQueueResponse', function(data){
		//console.log('socket io got a leaveQueueResponse with data: ' + JSON.stringify(data));
		document.querySelector('#attendee-core-dynamic-info').innerHTML = data;
	});

	socket.on('disconnect', function(){
		console.log('socket io disconnected');
	});

	return socket;
}

//send message to server to have the attendee either join or leave a queue
const handleQueueChange = function(event) {
	let queueChangeUrl = window.location.origin + event.target.dataset.queueChangeUrl;
	let queueChangeType = event.target.dataset.queueChangeType + 'Queue'; // makes the string 'joinQueue' or 'leaveQueue'
	socketIoConnection.emit(queueChangeType, queueChangeUrl);

	console.log('queueChangeUrl = ' + queueChangeUrl);
}

const setAttendeeCookie = function() {
		const attendeeId = document.querySelector('#attendee-info').dataset.attendeeid || 'no attendee-info tag';
		document.cookie = "attendeeId=" + attendeeId;
		console.log('setAttendeeCookie: should not need to do this as the cookie should be set by the server...but for now we have set a cookie attendeeId=' + attendeeId);
};

document.addEventListener('DOMContentLoaded', main);
