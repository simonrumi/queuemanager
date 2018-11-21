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
		console.log('got queueUpdated message with data: ' + JSON.stringify(data));
		//got some data like this
		//{"roomName":"SpaceMountain","changedQueuePlaces":{"5bf2c169f060b123745a76f9":20, "5bf44b2377cae226fc05037d": 19}}
		// so need to update the queue place for the given attractionName, if our attendeeId is in the list
		let changedQueuePlace;
		let attendeeId = getAttendeeIdFromInfoDiv();
		for (let idAsKey in data.changedQueuePlaces) {
			if (idAsKey == attendeeId) {
				changedQueuePlace = data.changedQueuePlaces[idAsKey];
				console.log('need to changedQueuePlace for ' + data.attractionName + ' to ' + changedQueuePlace);
				let possibleQueuePlacesToChange = document.querySelectorAll('.place-in-queue');
				updateAttractionInfo(possibleQueuePlacesToChange, data.attractionName, changedQueuePlace);
				break;
			}
		}
	});

	socket.on('queueLengthUpdated', function(data) {
		// got some data like this
		// {"attractionName":"SpaceMountain","changedQueueLength":25}
		console.log('queueLengthUpdated - data = ' + JSON.stringify(data));
		let possibleQueueLengthsToChange = document.querySelectorAll('.queue-length');
		updateAttractionInfo(possibleQueueLengthsToChange, data.attractionName, data.changedQueueLength);
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
	let queueNameArr = new String(event.target.dataset.queueName).split(' ');
	let queueName = glueWordsTogether(queueNameArr);
	socketIoConnection.emit(queueChangeType, {'queueChangeUrl': queueChangeUrl, 'queueName': queueName});
	console.log('\n queueName = ' + queueName + ', queueChangeUrl = ' + queueChangeUrl, );

	if (queueChangeType == 'joinQueue') {
		socketIoConnection.emit('joinRoom', queueName);
	} else if (queueChangeType == 'leaveQueue') {
		socketIoConnection.emit('leaveRoom', queueName);
	} else {
		console.log('ERROR: queueChangeType was neither joinQueue nor leaveQueue');
	}
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

const setAttendeeCookie = function() {
		const attendeeInfoDiv = document.querySelector('#attendee-info');
		let attendeeId;
		if (attendeeInfoDiv) {
			attendeeId = attendeeInfoDiv.dataset.attendeeid || 'no attendee-info tag';
			document.cookie = "attendeeId=" + attendeeId;
			console.log('setAttendeeCookie: attendeeId=' + attendeeId);
		}
};

const getAttendeeIdFromInfoDiv = function() {
	const attendeeInfoDiv = document.querySelector('#attendee-info');
	if (attendeeInfoDiv) {
		return attendeeInfoDiv.dataset.attendeeid;
	} else {
		return null;
	}
}

const updateAttractionInfo = function(possibleElementsToChange, attractionName, newInfo) {
	for (let i=0; i < possibleElementsToChange.length; i++) {
		let elementToChange = possibleElementsToChange[i];
		let attractionNameWithSpaces = elementToChange.dataset.attractionName;
		let attractionNameParts = attractionNameWithSpaces.split(' ');
		let attractionNameWithoutSpaces = glueWordsTogether(attractionNameParts);
		if (attractionNameWithoutSpaces == attractionName) {
			TweenMax.to(
				elementToChange,
				0.5, // seconds of animation
				{opacity: 0.0,
				color: '#ff0000',
				onComplete: function() {
					elementToChange.innerText = newInfo;
					TweenMax.to(
						elementToChange,
						0.5, // seconds of animation
						{opacity: 1.0, color: '#000000'});
				}
			});
		}
	}
}

// note that this is the same function as in HelperFunctions on the server
// is there a way not to have 2 copies of this?
const glueWordsTogether = function (words, roomName) {
	if (!roomName) {
		roomName = '';
	}
	if (words.length > 0) {
		let wordsLeft = words.slice();
		let nextWord = wordsLeft.pop();
		if (words.length == 1) {
			return nextWord + roomName;
		} else {
			return glueWordsTogether(wordsLeft, (nextWord + roomName));
		}
	} else {
		// shouldn't really have this case where words.length == 0
		// but just in case
		return roomName;
	}
}

document.addEventListener('DOMContentLoaded', main);
