let nesClient;
function initWebSocketClient(callback) {
  console.log('stock updates', 'start');
  let protocol = window.location.protocol.indexOf('https') >= 0 ? 'wss://' : 'ws://';

  nesClient = new nes.Client(protocol + window.location.origin.split('//').pop());
  const start = async () => {
    await nesClient.connect();
    callback();
  };

  start();
}

function subscribeToLiveUpdates(stock, callback) {
  callback({
    stock: stock
  });
  nesClient.subscribe('/livestream/' + stock, (update, flags) => {
    if (callback) callback(update);
    // console.log('stock updates: ' + stock, update)
  });
}
