// route
const rootController = require('../controllers/rootController');
const companiesController = require('../controllers/companiesController');
const propertiesController = require('../controllers/propertiesController');
const assetsController = require('../controllers/assetsController');
const availabilitiesController = require('../controllers/availabilitiesController');
const authenticationController = require('../controllers/authenticationController');

// middleware
const authenticateMiddleware = require('../middleware/authenticateMiddleware');

module.exports = function (app) {
  // anonymous calls
  app.route('/').get(rootController.api_greeter);
  app.route('/companies').get(companiesController.get_companies);
  app.route('/companies/:id').get(companiesController.get_company);
  app.route('/properties').get(propertiesController.get_properties);
  app.route('/properties/:id').get(propertiesController.get_property);
  app.route('/assets').get(assetsController.get_assets);
  app.route('/assets/:id').get(assetsController.get_asset);
  app.route('/availabilities').get(availabilitiesController.get_availabilities);
  app.route('/authenticate').post(authenticationController.post_authenticate);

  // authorized calls
  app.use(authenticateMiddleware.authenticate);
  app.route('/properties/id').post(propertiesController.post_property);
};