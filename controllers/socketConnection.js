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
      log('creating socket.io...');
      const server = http.Server(app);
      io = require('socket.io')(server);

      const port = process.env.PORT || 80;
      server.listen(port, function() {
        log('server listening on port ' + port);
      });

      io.on('connect', function(socket) {
        log('a user connected, socket.id is:\n' + socket.id + '\n');
        var uniqueSocketId = socket.id;

        socket.on('joinQueue', function(data, socket) {
          log('an attendee wants to join a queue; data given is: ' + data);
          attendeeInQueueControllerUsingSocket.addAttendeeToQueueUsingSocket(data, function(joinQueueResponse) {
            //log('returned to app.js after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeSubViewRenderer(joinQueueResponse);
            io.to(`${uniqueSocketId}`).emit('joinQueueResponse', renderedAttendeeView);
          }, function(err) {
            //log('returned to app.js with an error after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            io.to(`${uniqueSocketId}`).emit('joinQueueResponse', JSON.stringify(err));
          });
        });

        socket.on('leaveQueue', function(data, socket) {
          log('an attendee wants to leave a queue; data given is: ' + data);
          attendeeInQueueControllerUsingSocket.removeAttendeeFromQueueUsingSocket(data, function(leaveQueueResponse) {
            //log('\n returned to app.js after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeSubViewRenderer(leaveQueueResponse);
            io.to(`${uniqueSocketId}`).emit('leaveQueueResponse', renderedAttendeeView);

            attendeeInQueueControllerUsingSocket.updateQueuePlaces(data, function(results) {
              log('\n updateQueuePlaces results:\n' + JSON.stringify(results));
              // TODO get this broadcast thing working
              //socket.broadcast.emit('queueUpdated', renderedAttendeeView); //some issue with this io.broadcast.emit doesn't work either
            }, function(err) {
              log('updateQueuePlaces error: ' + err);
              io.to(`${uniqueSocketId}`).emit('updateQueuePlacesResponse', err);
            });
          }, function(err) {
            //log('\n returned to app.js with an error after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            io.to(`${uniqueSocketId}`).emit('leaveQueueResponse', err);
          });
        });

        socket.on('clientFoundKnownAttendee', function(data, socket) {
          log('got a knownAttendee from the client: ' + JSON.stringify(data));
          attendeeControllerUsingSocket.attendeeDetailUsingSocket(data, function(attendeeDetailData) {
              let renderedAttendeeView = attendeeSubViewRenderer(attendeeDetailData);
              io.to(`${uniqueSocketId}`).emit('knownAttendeeResponse', renderedAttendeeView);
            }, function(err) {
              io.to(`${uniqueSocketId}`).emit('knownAttendeeResponse', JSON.stringify(err));
          });
        });

        socket.on('clientFoundUnknownAttendee', function(data, socket) {
          log('\ngot an unknown Attendee from the client, creating a new client record; socket.id = ' + `${uniqueSocketId}` + '\n');
          attendeeControllerUsingSocket.attendeeCreateGet(data, function(attendeeDetailData) {
            //log('\n in unknownwAttendee, got attendeeDetailData = ' + JSON.stringify(attendeeDetailData));
            let renderedAttendeeView = attendeeSubViewRenderer(attendeeDetailData);
            io.to(`${uniqueSocketId}`).emit('unknownAttendeeResponse', renderedAttendeeView);
            }, function(err) {
              io.to(`${uniqueSocketId}`).emit('unknownAttendeeResponse', JSON.stringify(err));
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
