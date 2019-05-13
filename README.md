# MockTradingServer

## Disclaimer THIS IS A MOCK SERVER FOR DEMO AND LEARNING PURPOSE ONLY! PLEASE DO NOT USE THIS FOR ANY PRODUCTION CODE!

## Description

This is a demo project developed by Deni Spasovski which helps you learn hapi-js (version 18.3) by creating a mock trading application API's.
The client part of this project is MockTradingClientAngular.

All the user data is store on disk using `node-localstorage` library.

### Features

- Static data API for retrieving mock stocks info
- Web Sockets for live price streaming using `hapi/nes`
- User API for storing and retrieving stock watch list
- User API for executing mock transactions
- Stats API to that lists all user allocation count and liquidity (this project was used as workshop and the students competed who will have highest liquidity)

## Running the project

Run `npm run start` for a the server. Navigate to `http://localhost:3978/` or the default `process.env.PORT`.

## 3rd Party libraries used

| name                | source                                              | License               | Description                         |
| ------------------- | --------------------------------------------------- | --------------------- | ----------------------------------- |
| hapijs              | https://github.com/hapijs/hapi                      | Copyright Sideway Inc | Server side API library for node.js |
| applicationinsights | https://github.com/Microsoft/ApplicationInsights-JS | MIT                   | App Insights library for Azure      |
| node-localstorage   | https://github.com/lmaccherone/node-localstorage    | MIT                   | Library used for storing user data  |
