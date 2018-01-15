const rootController = require('../controllers/rootController');
const companiesController = require('../controllers/companiesController');
const propertiesController = require('../controllers/propertiesController');
const assetsController = require('../controllers/assetsController');

module.exports = function (app) {
  app.route('/')
    .get(rootController.api_greeter);

  app.route('/companies')
    .get(companiesController.get_companies);
  app.route('/companies/:id')
    .get(companiesController.get_company);

  app.route('/properties')
    .get(propertiesController.get_properties);
  app.route('/properties/:id')
    .get(propertiesController.get_property);

  app.route('/assets')
    .get(assetsController.get_assets);
  app.route('/assets/:id')
    .get(assetsController.get_asset);
};