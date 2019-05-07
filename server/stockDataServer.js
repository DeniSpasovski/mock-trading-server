let server = null;
var stockList = require('./stockList.json');

const routes = [
    {
        method: 'GET',
        path: '/stocklist',
        handler: function (request, h) {
            return stockList;
        }
    }, {
        method: 'POST',
        path: '/trackpage',
        handler: function (request, h) {
            // setTimeout(() => {
            //   sendTrackingData({
            //     id: request.params.id,
            //     page: request.params.page,
            //     date: new Date()
            //   })
            // }, 1);
            return true;
        }
    }
];

function initRoutes() {
    routes.forEach(function (route) {
        server.route(route)
    })
}

function broadcastData(stock, basePrice) {
    let streamName = '/livestream/' + stock;
    console.log('stream start', streamName)

    server.subscription(streamName);

    setInterval(() => {
        publishLivePrice(streamName, {
            stock: stock,
            price: basePrice + (basePrice / 10 * Math.random()) - (basePrice / 20),
            date: new Date()
        });
    }, 2000 + Math.random() * 5000);
}

function publishLivePrice(streamName, data) {
    // console.log('live tick',streamName, data)
    server.publish(streamName, data);
}


exports.init = function (serverRef) {
    server = serverRef;
    stockList.forEach(stock => {
        broadcastData(stock.symbol, stock.basePrice)
    });

    initRoutes();
};