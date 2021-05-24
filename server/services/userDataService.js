const Joi = require('joi');
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
    path: '/userstats',
    config: {
      description: 'Get all users stats',
      tags: ['api'],
      validate: {
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      let userStats = getGlobalUserStats();
      return Object.keys(userStats).map((userId) => {
        return userStats[userId];
      });
    }
  },
  {
    method: 'GET',
    path: '/userdata',
    config: {
      description: 'Get user data',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          userid: Joi.string()
            .required()
            .description('userid')
        }),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      return getUserData(request.headers.userid);
    }
  },
  {
    method: 'GET',
    path: '/userdata/allocations',
    config: {
      description: 'Get user allocations',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          userid: Joi.string()
            .required()
            .description('userid')
        }),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      return getUserData(request.headers.userid).allocations;
    }
  },
  ,
  {
    method: 'GET',
    path: '/userdata/liquidity',
    config: {
      description: 'Get user liquidity',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          userid: Joi.string()
            .required()
            .description('userid')
        }),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      return getUserData(request.headers.userid).liquidity;
    }
  },
  {
    method: 'GET',
    path: '/userdata/watchlist',
    config: {
      description: 'Get users stock watch list',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          userid: Joi.string()
            .required()
            .description('userid')
        }),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      return getUserData(request.headers.userid).watchList;
    }
  },
  {
    method: 'POST',
    path: '/userdata/watchlist',
    config: {
      description: 'Add or remove stock to watch list',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          userid: Joi.string()
            .required()
            .description('userid')
        }),
        payload: Joi.object({
          symbol: Joi.string()
            .required()
            .description('symbol'),
          action: Joi.string()
            .valid('ADD', 'REMOVE')
            .required()
            .description('ADD or REMOVE')
        }).label('FollowInfo'),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: function(request, h) {
      let followInfo = request.payload;
      result = followStock(request.headers.userid, followInfo);
      if (result.success) {
        return h.response(result);
      } else {
        return h.response(result).code(400);
      }
    }
  }
];

function followStock(userId, followInfo) {
  let stockInfo = stockDataServer.getStockInfo(followInfo.symbol);
  if (!stockInfo) {
    return new ServerResponse(false, `Stock symbol ${followInfo.symbol} not supported.`);
  }

  let userData = getUserData(userId);

  let followedStock = userData.watchList.find((allocation) => {
    return allocation.symbol == followInfo.symbol;
  });

  if (followInfo.action === 'ADD') {
    if (!followedStock) {
      followedStock = {
        symbol: followInfo.symbol
      };
      userData.watchList.push(followedStock);
      saveUserData(userId, userData);
      return new ServerResponse(true, `Stock ${followInfo.symbol} added to follow list.`);
    } else {
      return new ServerResponse(true, `Stock ${followInfo.symbol} already in follow list.`);
    }
  }

  if (followInfo.action === 'REMOVE') {
    if (!followedStock) {
      return new ServerResponse(false, `Stock ${followInfo.symbol} is not in follow list. It can't be un-followed.`);
    }

    userData.watchList = userData.watchList.filter((allocation) => {
      return allocation.symbol != followInfo.symbol;
    });
    saveUserData(userId, userData);

    return new ServerResponse(true, `Stock ${followInfo.symbol} removed from follow list.`);
  }

  return new ServerResponse(false, `Invalid action`);
}

function saveUserData(userId, data) {
  localStorage.setItem('userData_' + userId, JSON.stringify(data));
  saveGlobalUserStats(userId);
}

function getUserData(userId) {
  let data = localStorage.getItem('userData_' + userId);
  return data
    ? JSON.parse(data)
    : {
        userId: userId,
        liquidity: 0,
        allocations: [],
        watchList: []
      };
}

function saveGlobalUserStats(userId) {
  let userData = getUserData(userId);
  let userStats = getGlobalUserStats();
  userStats[userData.userId] = {
    userId: userData.userId,
    liquidity: userData.liquidity,
    allocations: userData.allocations.length,
    watchList: userData.watchList.length
  };
  localStorage.setItem('allUserData', JSON.stringify(userStats));
}

function getGlobalUserStats() {
  let data = localStorage.getItem('allUserData');
  return data ? JSON.parse(data) : {};
}

function initRoutes() {
  routes.forEach(function(route) {
    server.route(route);
  });
}

exports.saveUserData = saveUserData;
exports.getUserData = getUserData;
exports.init = function(serverRef) {
  server = serverRef;

  initRoutes();
};
