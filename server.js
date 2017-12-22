const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Using dotenv for environment variable when developing locally.
const dotenv = require('dotenv');
dotenv.config();

// Use the body parser for payload.
app.use(bodyParser.json());

// Allow cross origin from trusted source.
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Adding all routes.
require('./app/routes')(app);

// Listening all incoming calls.
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log('We are live on ' + port);
});