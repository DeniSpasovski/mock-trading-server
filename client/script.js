
function subscribeToLiveUpdates(stock, callback) {
    console.log('stock updates', 'start');
    const client = new nes.Client('ws://localhost:8008');
    const start = async () => {

        await client.connect();
        client.subscribe('/livestream/' + stock, (update, flags) => {
            if (callback) callback(update);
            // console.log('stock updates: ' + stock, update)
        });
    };

    start();
    callback({
        stock: stock
    })
    return client;
}
