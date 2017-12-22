const rootController = require('../controllers/rootController');

module.exports = function (app) {
  app.route('/')
    .get(rootController.api_greeter);
};