let server = null;
var userData = new Map();

const routes = [
    {
        method: 'GET',
        path: '/userdata',
        handler: function (request, h) {
            return userData.get(request.headers.userId);
        }
    }, {
        method: 'POST',
        path: '/userdata',
        handler: function (request, h) {
            userData.set(request.headers.userId, request.payload);
            return true;
        }
    }
];

function initRoutes() {
    routes.forEach(function (route) {
        server.route(route)
    })
}



exports.init = function (serverRef) {
    server = serverRef;

    initRoutes();
};