const Error = require('../models/error');
const { DocumentClient, DocumentBase } = require('documentdb');
const TaskDao = require('../models/taskDao');
const Authorization = require('../services/authorization/authorization');

const connectionPolicy = new DocumentBase.ConnectionPolicy();
connectionPolicy.DisableSSLVerification = true;
var documentDbClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
}, connectionPolicy);
var assetsDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');

exports.get_assets = function (req, res) {
    var property = req.query.property;

    assetsDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true and r.parent =\'' + property + '\'',
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

exports.post_asset = function (req, res) {
    var authorization = new Authorization();
    var propertyAddress = (req.params.id).split('&')[0];
    authorization.isAllowedOnContract(propertyAddress).then((ownerAddress) => {
        if (req.user === ownerAddress.toLowerCase()) {
            return assetsDao.init();
        } else {
            throw new Error(404, 'User is not allowed to modify this resource.');
        }
    }).then((result) => {
        return assetsDao.getPromise(req.params.id.toLowerCase());
    }).then((result) => {
        // todo: merge the two but only for allowed properties
        result.name = req.body.name;
        result.description = req.body.description;
        result.amenities = req.body.amenities;

        return assetsDao.updatePromise(result);
    }).then((result) => {
        res.status(200).json();
    }).catch((error) => {
        console.log(error);
        if (error.id === undefined)
            res.status(error.id).json(error);

        res.status(500).json(new Error(500, 'Error retrieving authorizations.'));
    });
};