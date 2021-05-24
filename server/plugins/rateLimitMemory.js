const Boom = require('@hapi/boom');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const internals = {
  pluginName: 'rateLimitMemoryPlugin'
};

internals.rateLimiter = new RateLimiterMemory({
  points: 100, //number of requests
  duration: 60 //in seconds
});

internals.getRequestIdentifier = function getRequestIdentifier(request) {
  var forwardedUrl = request.headers['x-forwarded-for'];
  if (forwardedUrl && forwardedUrl.length) {
    return forwardedUrl.split(',')[0].split(':')[0];
  }

  return request.info.remoteAddress;
};

module.exports = {
  name: internals.pluginName,
  version: '1.0.0',
  register: function (server) {
    server.ext('onPreAuth', async (request, h) => {
      try {
        await internals.rateLimiter.consume(internals.getRequestIdentifier(request));
        return h.continue;
      } catch (rej) {
        let error;
        if (rej instanceof Error) {
          // If some Redis error and `insuranceLimiter` is not set
          error = Boom.internal('Try later');
        } else {
          // Not enough points to consume
          error = Boom.tooManyRequests('Rate limit exceeded');
          error.output.headers['Retry-After'] = Math.round(rej.msBeforeNext / 1000) || 1;
        }

        return error;
      }
    });
  }
};
