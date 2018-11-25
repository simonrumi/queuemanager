# queuemanager

the concept is to allow attendeess at a theme park (like Disneyland) to be able to join queues virtually on a device
rather than standing in line. Attendees can join multiple queues at once

In this demo there are 3 queues and attendees are tracked with a cookie. 

The number of people in each queue are updated in real time as is the place the attendee is in each queue. To try it, go to:

https://shielded-sierra-81509.herokuapp.com/

The app uses Mongo db, Mongoose, Express, and Socket.io. 
All the realtime updating of the elements on the page are managed using Socket.io rather than Express
Also made a considerable use of the Async library for managing parallel and serial database calls.
