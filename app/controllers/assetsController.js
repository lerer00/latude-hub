const Error = require('../models/error');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');

var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
});
var assetsDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');

exports.get_assets = function (req, res) {
    assetsDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true',
            parameters: []
        };
        return assetsDao.findPromise(querySpec)
    }).then((rawAssets) => {
        return assetsDao.clean(rawAssets);
    }).then((assets) => {
        res.json(assets);
    }).catch((error) => {
        res.json(new Error(1, 'error querying assets.'));
    });
};