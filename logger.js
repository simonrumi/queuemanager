const logger = function(message) {
	const loggingOn = true;
	if (loggingOn) {
		console.log(message);
	}
}

module.exports = logger;