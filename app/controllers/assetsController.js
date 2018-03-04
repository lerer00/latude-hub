const Error = require('../models/error');
const { DocumentClient, DocumentBase } = require('documentdb')
const TaskDao = require('../models/taskDao');

const connectionPolicy = new DocumentBase.ConnectionPolicy();
connectionPolicy.DisableSSLVerification = true;
var documentDbClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
}, connectionPolicy);
var assetsDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');

exports.get_assets = function (req, res) {
    assetsDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true',
            parameters: []
        };
        return assetsDao.findPromise(querySpec)
    }).then((rawAssets) => {
        return assetsDao.cleanArray(rawAssets);
    }).then((assets) => {
        res.json(assets);
    }).catch((error) => {
        res.json(new Error(1, 'Error querying assets.'));
    });
};

exports.get_asset = function (req, res) {
    assetsDao.init().then((result) => {
        return assetsDao.getPromise(req.params.id.toLowerCase());
    }).then((rawAsset) => {
        if (rawAsset === undefined)
            throw new Error(404, 'The requested resource doesn\'t exist.');
        return assetsDao.cleanObject(rawAsset);
    }).then((asset) => {
        res.json(asset);
    }).catch((error) => {
        res.status(error.id).json(error);
    });
};