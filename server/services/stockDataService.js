const Joi = require('@hapi/joi');

let server = null;
var stockList = require('../data/stockList.json');
var stockListMap = new Map();
const mockPriceGenerator = require('./mockPriceGenerator');
const ServerResponse = require('../models/serverResponse');

const routes = [
  {
    method: 'GET',
    path: '/stocks',
    config: {
      description: 'Get stock list',
      notes: 'Returns list of all stocks that are available for trading',
      tags: ['api']
    },
    handler: function(request, h) {
      return stockList.map((stock) => {
        return {
          name: stock.name,
          symbol: stock.symbol,
          lastTick: stock.lastTick
        };
      });
    }
  },
  {
    method: 'GET',
    path: '/stocks/{symbol}/price',
    config: {
      description: 'Get latest tick for stock symbol',
      notes: 'Returns the latest (mock) price for a stock symbol',
      tags: ['api'],
      validate: {
        params: {
          symbol: Joi.string()
            .required()
            .description('Stock Symbol')
        }
      }
    },
    handler: function(request, h) {
      let stockInfo = getStockInfo(request.params.symbol);
      if (stockInfo) {
        if (stockInfo.lastTick) {
          return stockInfo.lastTick;
        } else {
          return h.response(new ServerResponse(false, 'Stock not priced yet.')).code(400);
        }
      } else {
        return h.response(new ServerResponse(false, 'Stock symbol not found.')).code(404);
      }
    }
  },
  {
    method: 'GET',
    path: '/stocks/{symbol}/price/yearly',
    config: {
      description: 'Get historic price for a stock',
      notes: 'Returns the historic (mock) price for last year for a single stock',
      tags: ['api'],
      validate: {
        params: {
          symbol: Joi.string()
            .required()
            .description('Stock Symbol')
        }
      }
    },
    handler: function(request, h) {
      let stockInfo = getStockInfo(request.params.symbol);
      if (stockInfo) {
        return mockPriceGenerator.getHistoricPrice(stockInfo, 'yearly');
      } else {
        return h.response(new ServerResponse(false, 'Stock symbol not found.')).code(404);
      }
    }
  },
  {
    method: 'GET',
    path: '/stocks/{symbol}/price/today',
    config: {
      description: 'Get todays price history for stock',
      notes: 'Returns the (mock) price for for the whole day for a single stock',
      tags: ['api'],
      validate: {
        params: {
          symbol: Joi.string()
            .required()
            .description('Stock Symbol')
        }
      }
    },
    handler: function(request, h) {
      let stockInfo = getStockInfo(request.params.symbol);
      if (stockInfo) {
        return mockPriceGenerator.getHistoricPrice(stockInfo, 'daily');
      } else {
        return h.response(new ServerResponse(false, 'Stock symbol not found.')).code(404);
      }
    }
  }
];

function initRoutes() {
  routes.forEach(function(route) {
    server.route(route);
  });
}

function publishLivePrice(streamName, data) {
  // console.log('live tick',streamName, data)
  server.publish(streamName, data);
}

function getStockInfo(symbol) {
  return stockListMap.get(symbol);
}

exports.getStockInfo = getStockInfo;
exports.init = function(serverRef) {
  server = serverRef;
  stockList.forEach((stock) => {
    stockListMap.set(stock.symbol, stock);
    stock.streamName = '/livestream/' + stock.symbol;
    console.log('stream start', stock.streamName);
    server.subscription(stock.streamName);
    mockPriceGenerator.initStream(stock, publishLivePrice);
  });

  initRoutes();
};
