const axios = require('axios');
const Error = require('../models/error');

exports.get_rates = function (req, res) {
    axios.get("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=CAD,USD").then((result) => {
        res.json({
            rates: "CAD;" + result.data.CAD + "|USD;" + result.data.USD
        });
    }).catch((error) => {
        res.status(500).json(new Error(1, error));
    });
};