const http = require('http');
const log = require('../logger');
const attendeeInQueueControllerUsingSocket = require('./attendeeInQueueControllerUsingSocket');
const attendeeControllerUsingSocket = require('./attendeeControllerUsingSocket');
let io = null;

/***************************** pug stuff *************************************/
const pug = require('pug');

// Compile the source code
const attendeeSubViewRenderer = pug.compileFile('./views/attendeeSubView.pug');


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
            let renderedAttendeeView = attendeeSubViewRenderer(joinQueueResponse);
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
            let renderedAttendeeView = attendeeSubViewRenderer(leaveQueueResponse);
            io.emit('leaveQueueResponse', renderedAttendeeView);

            attendeeInQueueControllerUsingSocket.updateQueuePlaces(data, function(results) {
              log('\n updateQueuePlaces results:\n' + JSON.stringify(results));
              // TODO get this broadcast thing working
              //socket.broadcast.emit('queueUpdated', renderedAttendeeView); //some issue with this io.broadcast.emit doesn't work either
            }, function(err) {
              log('updateQueuePlaces error: ' + err);
              io.emit('updateQueuePlacesResponse', err);
            });
          }, function(err) {
            //log('\n returned to app.js with an error after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            io.emit('leaveQueueResponse', err);
          });
        });

        socket.on('knownAttendee', function(data, socket) {
          log('got a knownAttendee from the client: ' + JSON.stringify(data));
          attendeeControllerUsingSocket.attendeeDetailUsingSocket(data, function(attendeeDetailData) {
              //log('in knownwAttendee, got attendeeDetailData = ' + JSON.stringify(attendeeDetailData));
              let renderedAttendeeView = attendeeSubViewRenderer(attendeeDetailData);
              io.emit('knownAttendeeResponse', renderedAttendeeView);
            }, function(err) {
              io.emit('knownAttendeeResponse', JSON.stringify(err));
          });
        });

        socket.on('unknownAttendee', function(data, socket) {
          log('got an unknown Attendee from the client, creating a new client record');
          attendeeControllerUsingSocket.attendeeCreateGet(data, function(attendeeDetailData) {
            log('\n in unknownwAttendee, got attendeeDetailData = ' + JSON.stringify(attendeeDetailData));
            let renderedAttendeeView = attendeeSubViewRenderer(attendeeDetailData);
            io.emit('unknownAttendeeResponse', renderedAttendeeView);
            }, function(err) {
              io.emit('unknownAttendeeResponse', JSON.stringify(err));
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
