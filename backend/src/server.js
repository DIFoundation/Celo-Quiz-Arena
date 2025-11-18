// src/server.js
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import sockets from './sockets.js';
import 'dotenv/config';

const PORT = process.env.PORT || 5000;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5000',
    methods: ['GET', 'POST'],
  },
});

// initialize sockets with io
sockets(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
