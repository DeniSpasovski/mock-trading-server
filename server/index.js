'use strict';

const Hapi = require('@hapi/hapi');
const Nes = require('@hapi/nes');
const Inert = require('@hapi/inert');

const staticFileServer = require('./staticFileServer');
const stockDataServer = require('./stockDataServer');
const userDataServer = require('./userDataServer');


// Create a server with a host and port
const server = Hapi.server({
  host: 'localhost',
  port: 8008,
  routes: {
    cors: {
      origin: ['http://localhost:8080'],
      additionalHeaders: ['x-token-token']
    }
  }
});

// Start the server
async function start() {
  try {
    await server.register(Nes);
    await server.register(Inert);
    staticFileServer.registerHttpHandler(server);
    await server.start();
    stockDataServer.init(server);
    userDataServer.init(server);
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};

start();