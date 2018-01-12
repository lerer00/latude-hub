const Error = require('../models/error');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');

var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
});
var propertiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');

exports.get_properties = function (req, res) {
    propertiesDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true',
            parameters: []
        };
        return propertiesDao.findPromise(querySpec)
    }).then((rawProperties) => {
        return propertiesDao.clean(rawProperties);
    }).then((properties) => {
        res.json(properties);
    }).catch((error) => {
        res.json(new Error(1, 'error querying properties.'));
    });
};