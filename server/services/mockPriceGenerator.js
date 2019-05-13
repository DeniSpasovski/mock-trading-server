const stockPriceMinDelay = process.env.APP_MOCKSERVER_PRICE_MIN_DELAY ? Number.parseInt(process.env.APP_MOCKSERVER_PRICE_MIN_DELAY) : 2000;
const stockPriceMaxDelay = process.env.APP_MOCKSERVER_PRICE_MAX_DELAY ? Number.parseInt(process.env.APP_MOCKSERVER_PRICE_MAX_DELAY) : 5000;

var dateHelpers = {
  getLastYearDate: function() {
    return new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1, 0);
  },
  getDaysInMonth: function(month, year) {
    return new Date(year, month + 1, 0).getDate();
  },
  getStartOfDay: function() {
    return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0);
  },
  areSameDates: function(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  },
  addMinutes: function(currentDate, minutes) {
    return new Date(currentDate.setMinutes(currentDate.getMinutes() + minutes)); //every 5 mins
  },
  addDays: function(currentDate, days) {
    return new Date(currentDate.setDate(currentDate.getDate() + days));
  },
  addHours: function(currentDate, hours) {
    return new Date(currentDate.setHours(currentDate.getHours() + hours));
  },
  addMonths: function(currentDate, months) {
    return new Date(currentDate.setMonth(currentDate.getMonth() + months));
  }
};
/**
 * Function used to generate the mock price seeds
 *
 */
function seedHistoricPrices() {
  stockList.forEach((stock) => {
    dailySeed = new Array(12).fill(0).map(() => {
      return 1 + Math.random() * 0.02 - 0.01;
    });

    yearlySeed = new Array(12).fill(0).map(() => {
      return 0.5 + Math.random();
    });

    stock.historicSeed = {
      daily: dailySeed,
      yearly: yearlySeed
    };
  });
}

function generateDailyPrice(basePrice, historicSeed, date, useRandom = true) {
  let interval = date.getHours() % 12; // we have 12 prices in total, for daily price we sample every hour
  let percentage = date.getMinutes() / 60; // how many minutes have passed determines percentage
  return generatePriceFromSeed(basePrice, historicSeed, interval, percentage, 100, useRandom);
}

function generateYearlyPrice(basePrice, historicSeed, date, useRandom = true) {
  let interval = date.getMonth() % 12; // we have 12 prices in total, for yearly price we sample every month
  let percentage = date.getDate() > 1 ? date.getDate() / dateHelpers.getDaysInMonth(date.getMonth(), date.getFullYear()) : 0; // how many days have passed determines percentage
  return generatePriceFromSeed(basePrice, historicSeed, interval, percentage, 10, useRandom);
}

function generatePriceFromSeed(basePrice, historicSeed, interval, percentage, pricePrecision, useRandom = true) {
  let startPrice = historicSeed[interval]; // gets the price of the current interval
  let endPrice = historicSeed[(interval + 1) % 12]; // gets the price of the next interval
  // the newly created price is in between current and next interval depending on time passed
  let currentPrice = basePrice * (startPrice + (endPrice - startPrice) * percentage);
  // we generate random price from the new base
  return useRandom ? generateRandomPrice(currentPrice, pricePrecision) : currentPrice;
}

function generateRandomPrice(basePrice, pricePrecision) {
  return basePrice + (basePrice / pricePrecision) * Math.random() - basePrice / (pricePrecision * 2);
}

function generatePrice(stock, date, priceType = 'daily', useRandom = true) {
  let basePrice = stock.basePrice;
  if (stock.historicSeed && stock.historicSeed[priceType]) {
    if (priceType == 'daily') {
      // use the last historic stock tick to generate more precise price for daily
      let historicPriceList = stock.historicPrice['yearly'] ? stock.historicPrice['yearly'].detailed : [stock.basePrice];
      return generateDailyPrice(
        historicPriceList[historicPriceList.length - 1].price || stock.basePrice,
        stock.historicSeed[priceType],
        date,
        useRandom
      );
    } else {
      return generateYearlyPrice(stock.basePrice, stock.historicSeed[priceType], date, useRandom);
    }
  } else {
    return generateRandomPrice(basePrice, 100);
  }
}

// Historic data
function getHistoricPriceToday(stock) {
  let historicPrice = stock.historicPrice['daily'] ? stock.historicPrice['daily'].detailed : [];
  return generateHistoricPriceList(stock, historicPrice, dateHelpers.getStartOfDay(), 'daily', true, dateHelpers.addMinutes, 5);
}

function getHistoricPriceTodayHourlyNonRandom(stock) {
  let historicPrice = stock.historicPrice['daily'] ? stock.historicPrice['daily'].aggregated : [];
  return generateHistoricPriceList(stock, historicPrice, dateHelpers.getStartOfDay(), 'daily', false, dateHelpers.addHours, 1);
}

function getHistoricPriceForLastYear(stock) {
  let historicPrice = stock.historicPrice['yearly'] ? stock.historicPrice['yearly'].detailed : [];
  return generateHistoricPriceList(stock, historicPrice, dateHelpers.getLastYearDate(), 'yearly', true, dateHelpers.addDays, 1);
}

function getHistoricPriceForLastYearMontlyNonRandom(stock) {
  let historicPrice = stock.historicPrice['yearly'] ? stock.historicPrice['yearly'].aggregated : [];
  return generateHistoricPriceList(stock, historicPrice, dateHelpers.getLastYearDate(), 'yearly', false, dateHelpers.addMonths, 1);
}

function generateHistoricPriceList(stock, historicPrice, startDate, priceType, useRandom, intervalFn, interval) {
  let lastDate = new Date();

  if (historicPrice.length) {
    // if we already have price we can use the last price date as starting point - or if it's a new day we need to reset the cache
    let lastPriceDate = new Date(historicPrice[historicPrice.length - 1].date);
    if (!dateHelpers.areSameDates(lastPriceDate, lastDate)) {
      historicPrice = [];
    } else {
      startDate = intervalFn(lastPriceDate, interval);
    }
  }

  while (startDate < lastDate) {
    historicPrice.push({
      date: new Date(startDate),
      price: generatePrice(stock, startDate, priceType, useRandom)
    });
    startDate = intervalFn(startDate, interval);
  }

  return historicPrice;
}

function getStockPrice(stock, publishLivePrice) {
  let stockTick = {
    stock: stock.symbol,
    price: generatePrice(stock, new Date()),
    date: new Date()
  };
  stock.lastTick = stockTick;
  publishLivePrice(stock.streamName, stockTick);
}

function getHistoricPrice(stock, priceType = 'daily') {
  if (priceType == 'daily') {
    return getDailyHistoricPrice(stock);
  } else {
    return getYearlyHistoricPrice(stock);
  }
}

function getYearlyHistoricPrice(stock) {
  stock.historicPrice['yearly'] = {
    detailed: getHistoricPriceForLastYear(stock),
    aggregated: getHistoricPriceForLastYearMontlyNonRandom(stock)
  };

  return stock.historicPrice['yearly'];
}

function getDailyHistoricPrice(stock) {
  stock.historicPrice['daily'] = {
    detailed: getHistoricPriceToday(stock),
    aggregated: getHistoricPriceTodayHourlyNonRandom(stock)
  };

  return stock.historicPrice['daily'];
}

function initStockHistoricData(stock) {
  stock.historicPrice = stock.historicPrice || {};
  getYearlyHistoricPrice(stock);
  getDailyHistoricPrice(stock);
}

function initStream(stock, publishLivePrice) {
  initStockHistoricData(stock);
  setInterval(() => {
    getStockPrice(stock, publishLivePrice);
  }, stockPriceMinDelay + Math.random() * stockPriceMaxDelay);
}

exports.initStream = initStream;
exports.getHistoricPrice = getHistoricPrice;
