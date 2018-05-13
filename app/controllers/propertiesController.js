const { DocumentClient, DocumentBase } = require('documentdb')
const Error = require('../models/error');
const TaskDao = require('../models/taskDao');
const Authorization = require('../services/authorization/authorization');

const connectionPolicy = new DocumentBase.ConnectionPolicy();
connectionPolicy.DisableSSLVerification = true;
var documentDbClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
}, connectionPolicy);
var propertiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');

var multer = require('multer');
var MulterAzureStorage = require('multer-azure-storage')
var upload = multer({
    storage: new MulterAzureStorage({
        azureStorageConnectionString: process.env.BLOB_STORAGE,
        containerName: process.env.BLOB_STORAGE_PHOTO_CONTAINER_NAME,
        containerSecurity: 'blob'
    })
}).array('photos', 12);

exports.get_properties = function (req, res) {
    if (req.query.geojson === undefined) {
        res.status(403).json(new Error(1, "Parameter 'geojson' is required."));
        return;
    }

    propertiesDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true and ST_WITHIN(r.location, ' + req.query.geojson + ')',
            parameters: []
        };
        return propertiesDao.findPromise(querySpec)
    }).then((rawProperties) => {
        return propertiesDao.cleanArray(rawProperties);
    }).then((properties) => {
        res.json(properties);
    }).catch((error) => {
        res.status(500).json(new Error(500, 'Error querying properties.'));
    });
};

exports.get_property = function (req, res) {
    propertiesDao.init().then((result) => {
        return propertiesDao.getPromise(req.params.id.toLowerCase());
    }).then((rawProperty) => {
        if (rawProperty === undefined)
            throw new Error(404, 'The requested resource doesn\'t exist.');
        return propertiesDao.cleanObject(rawProperty);
    }).then((property) => {
        res.json(property);
    }).catch((error) => {
        res.status(error.id).json(error);
    });
};

exports.post_property = function (req, res) {
    var authorization = new Authorization();
    authorization.isAllowedOnContract(req.params.id).then((ownerAddress) => {
        if (req.user === ownerAddress.toLowerCase()) {
            return propertiesDao.init();
        } else {
            throw new Error(404, 'User is not allowed to modify this resource.');
        }
    }).then((result) => {
        return propertiesDao.getPromise(req.params.id.toLowerCase());
    }).then((result) => {
        // todo: merge the two but only for allowed properties
        result.name = req.body.name;
        result.description = req.body.description;
        result.location = req.body.location;
        result.amenities = req.body.amenities;

        return propertiesDao.updatePromise(result);
    }).then((result) => {
        res.status(200).json();
    }).catch((error) => {
        if (error.id != undefined)
            res.status(error.id).json(error);

        res.status(500).json(new Error(500, 'Error retrieving authorizations.'));
    });
};

exports.post_property_upload = function (req, res) {
    var authorization = new Authorization();
    authorization.isAllowedOnContract(req.params.id).then((ownerAddress) => {
        if (req.user === ownerAddress.toLowerCase()) {
            return propertiesDao.init();
        } else {
            throw new Error(404, 'User is not allowed to modify this resource.');
        }
    }).then((result) => {
        upload(req, res, function (err) {
            if (err) {
                throw new Error(500, 'Error uploading images to storage.');
                return
            }

            propertiesDao.getPromise(req.params.id.toLowerCase()).then((result) => {
                req.files.forEach(file => {
                    result.images.push(file.url);
                });

                return propertiesDao.updatePromise(result);
            }).then((result) => {
                res.status(200).json();
            }).catch((error) => {
                if (error.id === undefined)
                    res.status(error.id).json(error);

                res.status(500).json(new Error(500, 'Error uploading images to storage.'));
            });
        });
    }).catch((error) => {
        if (error.id != undefined)
            res.status(error.id).json(error);

        res.status(500).json(new Error(500, 'Error retrieving authorizations.'));
    });
};