const Error = require('../models/error');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');

var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
});
var propertiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');

exports.get_properties = function (req, res) {
    var center;
    var radius;

    if (req.query.center === undefined) {
        res.status(403).json(new Error(1, "Center parameter is required."));
        return;
    } else {
        try {
            center = JSON.parse(req.query.center);
            if (!Array.isArray(center)) {
                throw "Center is not a valid array.";
            }
            if (center.length !== 2) {
                throw "Center cardinality is not 2.";
            }
            if (isNaN(center[0]) || isNaN(center[1])) {
                throw "Center values needs to be valid number.";
            }
        } catch (error) {
            console.log(error);
            res.status(403).json(new Error(1, error));
            return;
        }
    }

    if (req.query.radius !== undefined) {
        try {
            radius = req.query.radius;
            if (isNaN(radius)) {
                throw "Radius is not a valid number.";
            }
            if (radius < 0) {
                throw "Radius need to be grater or equal than 0.";
            }
            if (radius > 100000) {
                throw "Radius need to be smaller than 100000.";
            }
        } catch (error) {
            res.status(403).json(new Error(1, error));
            return;
        }
    } else {
        // defaulting radius to 10km
        radius = 10000;
    }

    propertiesDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true and ST_DISTANCE(r.location, {\'type\': \'Point\', \'coordinates\': ' + JSON.stringify(center) + '}) < ' + radius,
            parameters: []
        };
        return propertiesDao.findPromise(querySpec)
    }).then((rawProperties) => {
        return propertiesDao.cleanArray(rawProperties);
    }).then((properties) => {
        res.json(properties);
    }).catch((error) => {
        res.json(new Error(1, 'Error querying properties.'));
    });
};

exports.get_property = function (req, res) {
    propertiesDao.init().then((result) => {
        return propertiesDao.getPromise(req.params.id);
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