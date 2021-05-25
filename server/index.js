'use strict';

const Hapi = require('@hapi/hapi');
const Nes = require('@hapi/nes');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const HapiPino = require('hapi-pino');

const rateLimitMemory = require('./plugins/rateLimitMemory');

const Pack = require('../package');
const staticFileService = require('./services/staticFileService');
const stockDataService = require('./services/stockDataService');
const userDataService = require('./services/userDataService');
const transactionDataService = require('./services/transactionDataService');
let appInsights;

if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights = require('applicationinsights');
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY);
  appInsights.start();
}

// Create a server with a host and port
const server = Hapi.server({
  port: process.env.port || process.env.PORT || 3978,
  routes: {
    cors: {
      origin: ['http://localhost:8080', 'http://localhost:4200'],
      additionalHeaders: ['userid', 'x-requested-with', 'x-token-token']
    }
  }
});

server.ext({
  type: 'onRequest',
  method: function (request, h) {
    //console.log(new Date().toISOString(), request.info.id ,request.method, request.path, request.headers.userid)

    if (request.headers.userid) {
      if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
        appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.userId] = request.headers.userid;
      }
    }
    return h.continue;
  }
});

const swaggerOptions = {
  info: {
    title: 'THIS IS A MOCK DATA SERVER PLEASE USE WITH CAUTION',
    version: Pack.version
  }
};

// Start the server
async function start() {
  try {
    await server.register(rateLimitMemory);
    await server.register(Nes);
    await server.register({
      plugin: HapiPino,
      options: {
        prettyPrint: process.env.NODE_ENV !== 'production',
        // Redact Authorization headers, see https://getpino.io/#/docs/redaction
        redact: ['req.headers.authorization']
      }
    });

    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: swaggerOptions
      }
    ]);

    staticFileService.registerHttpHandler(server);
    stockDataService.init(server);
    userDataService.init(server);
    transactionDataService.init(server);

    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server starting in folder:', __dirname);
  console.log('Server running at:', server.info.uri);
}

start();
