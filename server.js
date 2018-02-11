const Listener = require('./app/services/listener');
const Populate = require('./app/services/populate');
const CronJob = require('cron').CronJob;
const colors = require('colors');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Using dotenv for environment variable when developing locally.
const dotenv = require('dotenv');
dotenv.config();

// Use the body parser for payload.
app.use(bodyParser.json());

// allow cross origin from trusted source
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// populate cosmosDb with dev data
// var populate = new Populate();
// setTimeout(() => {
//     populate.assets('./dev/companies/', populate.companiesDao);
//     populate.assets('./dev/properties/', populate.propertiesDao);
//     populate.assets('./dev/assets/', populate.assetsDao);
// }, 2000);


// adding all routes
require('./app/routes')(app);

// start the blockchain listener
var listener = new Listener();

// need to catch up
setTimeout(() => {
    // catching up from block 0
    listener.catchUp(0);

    // run every 10 second
    var job = new CronJob({
        cronTime: '*/10 * * * * *',
        onTick: function () {
            console.log(colors.cyan('[i] scanning for new events.'));
            listener.listen();
        },
        onComplete: function () {
            console.log(colors.cyan('[i] stop listening.'));
        },
        start: false,
        timeZone: 'America/Los_Angeles'
    });
    job.start();
}, 2000);


// Listening all incoming calls.
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log('We are live on ' + port);
});