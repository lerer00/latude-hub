const Error = require('../models/error');
const colors = require('colors');
var jwt = require('jsonwebtoken');

exports.authenticate = function (req, res, next) {
  if (req.headers['authorization'] === undefined) {
    res.status(500).send({ error: new Error(1, 'Failed to authenticate.') });
    return;
  }

  jwt.verify(req.headers['authorization'], 'latude', function (err, decoded) {
    if (err) {
      res.status(500).send({ error: new Error(1, 'Failed to authenticate.') });
      return;
    } else {
      req.user = decoded.user;
      next();
    }
  });
}