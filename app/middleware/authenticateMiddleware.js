const Error = require('../models/error');
const colors = require('colors');
var jwt = require('jsonwebtoken');

exports.authenticate = function (req, res, next) {
  jwt.verify(req.body.token, 'latude', function (err, decoded) {
    if (err) {
      res.status(500).send({ error: new Error(1, 'Failed to authenticate.') });
    } else {
      req.user = decoded.user;
      next();
    }
  });
}