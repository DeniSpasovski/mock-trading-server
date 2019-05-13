'use strict';

const Hapi = require('@hapi/hapi');
const Nes = require('@hapi/nes');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const Good = require('@hapi/good');
const HapiSwagger = require('hapi-swagger');

const Pack = require('../package');
const staticFileService = require('./services/staticFileService');
const stockDataService = require('./services/stockDataService');
const userDataService = require('./services/userDataService');
const transactionDataService = require('./services/transactionDataService');

if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  const appInsights = require('applicationinsights');
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
  method: function(request, h) {
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

const loggingOptions = {
  ops: {
    interval: 1000
  },
  reporters: {
    myConsoleReporter: [
      {
        module: '@hapi/good-squeeze',
        name: 'Squeeze',
        args: [{ log: '*', response: '*' }]
      },
      {
        module: '@hapi/good-console',
        args: [{ format: 'YYYY-MM-DD|HH:mm:ss.SSS' }]
      },
      'stdout'
    ]
  }
};

// Start the server
async function start() {
  try {
    await server.register({
      plugin: Good,
      options: loggingOptions
    });
    await server.register(Nes);
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
