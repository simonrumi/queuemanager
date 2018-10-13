const main = function() {
	//const socket = io();
	const socketLocation = window.location.protocol + '//' + window.location.hostname;
	console.log('socketLocation = ' + socketLocation);
	const socket = io(socketLocation);
	socket.on('connect', function(){
		console.log('socket io connected');
	});
	socket.on('event', function(data){
		console.log('socket io got an event with data: ' + JSON.stringify(data));
	});
	socket.on('disconnect', function(){
		console.log('socket io disconnected');
	});

	const joinQueueDivs = document.querySelectorAll('.joinqueue');
	for (let i=0; i<joinQueueDivs.length; i++) {
		let joinQueueUrl = joinQueueDivs[i].dataset.joinQueueUrl;
		joinQueueDivs[i].onclick(function(event) {
			console.log('got event.target.dataset.joinQueueUrl = ' + event.target.dataset.joinQueueUrl);
			fetch(joinQueueUrl).then(function(response) {
				console.log('heard click and got response: ' + JSON.stringify(response));
			});
		});
	}

	//set a cookie on the page using the attendee id from the mongo db (which is already given to us when the page )
	setAttendeeCookie();
}

const setAttendeeCookie = (function() {
	return function() {
		const attendeeId = document.querySelector('#attendee-info').dataset.attendeeid || 'no attendee-info tag';
		document.cookie = "attendeeId=" + attendeeId;

		//QQQQ we do not have the attendeeId at this point - need to listen for an event from node (that we set up)  then set the cookie ...somewhow
	}
})();

document.addEventListener('DOMContentLoaded', main);
