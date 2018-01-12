const rootController = require('../controllers/rootController');
const companiesController = require('../controllers/companiesController');
const propertiesController = require('../controllers/propertiesController');
const assetsController = require('../controllers/assetsController');

module.exports = function (app) {
  app.route('/')
    .get(rootController.api_greeter);

  app.route('/companies')
    .get(companiesController.get_companies);

  app.route('/properties')
    .get(propertiesController.get_properties);

  app.route('/assets')
    .get(assetsController.get_assets);
};