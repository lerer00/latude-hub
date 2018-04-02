const Error = require('../models/error');

exports.get_rates = function (req, res) {
    res.json({ "rates": "CAD;1000.00|USD;500.00" });
};