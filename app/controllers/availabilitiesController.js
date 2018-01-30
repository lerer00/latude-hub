const Error = require('../models/error');

exports.get_availabilities = function (req, res) {
    res.status(403).json(new Error(1, "ok"));
};