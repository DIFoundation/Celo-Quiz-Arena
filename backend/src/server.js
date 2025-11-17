// src/server.js
const http = require('http');
const app = require('./app');
const sockets = require('./sockets');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// initialize sockets with io
sockets(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
