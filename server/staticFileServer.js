
exports.registerHttpHandler = function registerHttpHandler(server) {
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: './client',
                index: ['index.html']
            }
        }
    });
}