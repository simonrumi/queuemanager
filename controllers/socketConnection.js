const http = require('http');
const log = require('../logger');
const attendeeInQueueControllerUsingSocket = require('./attendeeInQueueControllerUsingSocket');
const attendeeControllerUsingSocket = require('./attendeeControllerUsingSocket');
const QueueModel = require('../models/queueModel');
const async = require('async');
const HelperFunctions = require('./helperFunctions');

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
        log('a user connected, socket.id is: ' + socket.id);
        var uniqueSocketId = socket.id;

        socket.on('joinQueue', function(data) {
          log('an attendee wants to join a queue; data given is: ' + data);
          attendeeInQueueControllerUsingSocket.addAttendeeToQueueUsingSocket(data, function(joinQueueResponse) {
            //log('returned to app.js after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeSubViewRenderer(joinQueueResponse);
            io.to(`${uniqueSocketId}`).emit('joinQueueResponse', renderedAttendeeView);

            attendeeInQueueControllerUsingSocket.updateQueueLength(data, function(results) {
              io.emit('queueLengthUpdated', results);
            }, function(err) {
              io.emit('queueLengthUpdated', err);
            });
          }, function(err) {
            //log('returned to app.js with an error after calling addAttendeeToQueueUsingSocket, joinQueueResponse = ' + JSON.stringify(joinQueueResponse));
            io.to(`${uniqueSocketId}`).emit('joinQueueResponse', JSON.stringify(err));
          });
        });

        socket.on('joinRoom', function(roomName) {
          socket.join(roomName);
          log('user joined room ' + roomName);
        });

        socket.on('leaveQueue', function(data) {
          log('\nan attendee wants to leave a queue; data given is: ' + JSON.stringify(data));
          attendeeInQueueControllerUsingSocket.removeAttendeeFromQueueUsingSocket(data, function(leaveQueueResponse) {
            //log('\n returned to app.js after calling removeAttendeeFromQueueUsingSocket, leaveQueueResponse = ' + JSON.stringify(leaveQueueResponse));
            // Render the Pug template for attendeeView, using the data we just got, then send it to the client
            let renderedAttendeeView = attendeeSubViewRenderer(leaveQueueResponse);
            io.to(`${uniqueSocketId}`).emit('leaveQueueResponse', renderedAttendeeView);

            attendeeInQueueControllerUsingSocket.updateQueuePlaces(data, function(results) {
              log('\n updateQueuePlaces results:\n' + JSON.stringify(results));
              let roomName = data.queueName;
              io.to(roomName).emit('queueUpdated', {'attractionName': roomName, 'changedQueuePlaces': results.changedQueuePlaces});
            }, function(err) {
              log('updateQueuePlaces error: ' + err);
              io.to(`${uniqueSocketId}`).emit('updateQueuePlaces', err);
            });

            attendeeInQueueControllerUsingSocket.updateQueueLength(data, function(results) {
              io.emit('queueLengthUpdated', results);
            }, function(err) {
              io.emit('queueLengthUpdated', err);
            });

          }, function(err) {
            io.to(`${uniqueSocketId}`).emit('leaveQueueResponse', err);
          });
        });

        socket.on('leaveRoom', function(roomName) {
          socket.leave(roomName);
          log('user left room ' + roomName);
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

// might not want this
const createRoomForEachQueue = function(socket) {
  QueueModel.find({}).exec(function(err, allQueues) {
    async.eachOf(allQueues, function(item, index, callback) {
      //strip spaces from the queue name so we can use it as a socket room name
      let words = new String(item.attractionName).split(' ');
      let roomName = HelperFunctions.glueWordsTogether(words);
      log('making a socket room called ' + roomName);
      socket.join(roomName);
      callback();
    }, function(err, results) {
      if (err) {
        log('\ncreateRoomForEachQueue error: ' + err);
      } else {
        log('\ncreateRoomForEachQueue: success!');
      }
    });
  });
}

module.exports = socketConn;
