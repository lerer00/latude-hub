const Listener = require('./app/services/listener');
const CronJob = require('cron').CronJob;
const colors = require('colors');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// using dotenv for environment variable when developing locally
const dotenv = require('dotenv');
dotenv.config();

// use the body parser for payload
app.use(bodyParser.json());

// allow cross origin from trusted source
app.use(function (req, res, next) {
    // only allow those origins
    var allowedOrigins = [process.env.WEB_APP_URL, process.env.AMS_APP_URL, process.env.BOO_APP_URL];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // only allow these headers
    res.header("Access-Control-Allow-Headers", "Origin, Authorization, X-Requested-With, Content-Type, Accept");

    //intercepts OPTIONS method
    if (req.method === 'OPTIONS') {
        //respond with 200
        res.status(200).send();
    }
    else {
        //move on
        next();
    }
});

// adding all routes
require('./app/routes')(app);

// start the blockchain listener
// var listener = new Listener();
// listener.init().then((result) => {
//     console.log(colors.cyan('[i] storage collections correctly created.'));

//     // catching up from block 0
//     listener.catchUp(0);

//     // run every 10 second
//     var job = new CronJob({
//         cronTime: '*/10 * * * * *',
//         onTick: function () {
//             console.log(colors.cyan('[i] scanning for new events.'));
//             listener.listen();
//         },
//         onComplete: function () {
//             console.log(colors.cyan('[i] stop listening.'));
//         },
//         start: false,
//         timeZone: 'America/Los_Angeles'
//     });
//     job.start();
// })


// listening all incoming calls
const port = process.env.PORT || 80;
app.listen(port, () => {
});