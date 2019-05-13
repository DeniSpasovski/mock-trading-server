const Joi = require('@hapi/joi');

const userDataServer = require('./userDataService');
const stockDataServer = require('./stockDataService');
const ServerResponse = require('../models/serverResponse');

if (typeof localStorage === 'undefined' || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  let rootFolder = process.env.APP_MOCKSERVER_DATA_FOLDER || '.';
  localStorage = new LocalStorage(rootFolder + '/.userdata');
}

let server = null;

const routes = [
  {
    method: 'GET',
    path: '/transactions',
    config: {
      description: 'Get user transactions',
      tags: ['api'],
      validate: {
        headers: {
          userid: Joi.string()
            .required()
            .description('userid')
        },
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      return getTransactions(request.headers.userid);
    }
  },
  {
    method: 'POST',
    path: '/transactions',
    config: {
      description: 'Execute a transaction',
      tags: ['api'],
      validate: {
        headers: {
          userid: Joi.string()
            .required()
            .description('userid')
        },
        payload: Joi.object({
          symbol: Joi.string()
            .required()
            .description('symbol'),
          side: Joi.string()
            .valid(['BUY', 'SELL'])
            .required()
            .description('BUY or SELL'),
          amount: Joi.number()
            .required()
            .description('amount')
        }).label('Order'),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      let order = request.payload;
      result = executeOrder(request.headers.userid, order);
      if (typeof result !== 'string') {
        return Object.assign({}, { transaction: result }, userDataServer.getUserData(request.headers.userid));
      } else {
        return h.response(new ServerResponse(false, result)).code(400);
      }
    }
  }
];

function executeOrder(userId, order) {
  let stockInfo = stockDataServer.getStockInfo(order.symbol);
  if (!stockInfo) {
    return `Stock symbol ${order.symbol} not supported.`;
  }

  if (!stockInfo.lastTick) {
    return `Stock ${order.symbol} is not priced yet.`;
  }

  if (order.amount <= 0) {
    return `Amout is less than zero.`;
  }

  let userData = userDataServer.getUserData(userId);

  let currentAllocation = userData.allocations.find((allocation) => {
    return allocation.symbol == order.symbol;
  });

  let transaction = {
    side: order.side,
    symbol: order.symbol,
    amount: order.amount,
    tickPrice: stockInfo.lastTick.price,
    cost: order.amount * stockInfo.lastTick.price,
    date: new Date()
  };

  if (transaction.side === 'BUY') {
    if (currentAllocation) {
      currentAllocation.amount += order.amount;
    } else {
      userData.allocations.push({
        symbol: order.symbol,
        amount: order.amount
      });
    }
    userData.liquidity -= transaction.cost;
  } else {
    if (!currentAllocation) {
      return `Stock ${order.symbol} allocation not found. Can't sell.`;
    } else {
      if (currentAllocation.amount < order.amount) {
        return (
          `Current allocation for stock ${order.symbol}:${currentAllocation.amount}` +
          ` is less than requested sell amount:${transaction.amount}.`
        );
      } else {
        currentAllocation.amount -= order.amount;
      }
    }

    userData.liquidity += transaction.cost;
  }

  saveTransaction(userId, transaction);
  userDataServer.saveUserData(userId, userData);
  return transaction;
}

function saveTransaction(userId, transaction) {
  let transactions = getTransactions(userId);
  transactions.push(transaction);
  localStorage.setItem('userTransactions_' + userId, JSON.stringify(transactions));
}

function getTransactions(userId) {
  let data = localStorage.getItem('userTransactions_' + userId);
  return data ? JSON.parse(data) : [];
}

function initRoutes() {
  routes.forEach(function(route) {
    server.route(route);
  });
}

exports.init = function(serverRef) {
  server = serverRef;
  initRoutes();
};
