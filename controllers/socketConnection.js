const http = require('http');
const log = require('../logger');
const attendeeInQueueControllerUsingSocket = require('./attendeeInQueueControllerUsingSocket');
let io = null;

/***************************** pug stuff *************************************/
const pug = require('pug');

// Compile the source code
const attendeeViewRenderer = pug.compileFile('./views/attendeeSubView.pug');


/***************************** socketConn *************************************/
const socketConn = {
  getSocketConn: function(app) {
    if (io) {
      return io;
    } else {
      log('about to create a server then io');
      const server = http.Server(app);
      io = require('socket.io')(server);

      const port = process.env.PORT || 80;
      server.listen(port, function() {
        log('server listening on port ' + port);
      });

      io.on('connect', function(socket) {
        log('a user connected');

        socket.on('joinQueue', function(data, socket) {
          log('an attendee wants to join a queue; data given is: ' + data);
          attendeeInQueueControllerUsingSocket.addAttendeeToQueueUsingSocket(data, function(joinQueueResponse) {
            //log('returned to app.js after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeViewRenderer(joinQueueResponse);
            io.emit('joinQueueResponse', renderedAttendeeView);
          }, function(err) {
            //log('returned to app.js with an error after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            io.emit('joinQueueResponse', JSON.stringify(err));
          });
        });

        socket.on('leaveQueue', function(data, socket) {
          log('an attendee wants to leave a queue; data given is: ' + data);
          attendeeInQueueControllerUsingSocket.removeAttendeeFromQueueUsingSocket(data, function(leaveQueueResponse) {
            //log('\n returned to app.js after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeViewRenderer(leaveQueueResponse);
            io.emit('leaveQueueResponse', renderedAttendeeView);
          }, function(err) {
            //log('\n returned to app.js with an error after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            io.emit('leaveQueueResponse', JSON.stringify(err));
          });
        });

        socket.on('disconnect', function(){
          log('the user disconnected');
        });
      });
      return io;
    }
  }
}

module.exports = socketConn;
