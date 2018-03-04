const Error = require('../models/error');
const { DocumentClient, DocumentBase } = require('documentdb')
const TaskDao = require('../models/taskDao');

const connectionPolicy = new DocumentBase.ConnectionPolicy();
connectionPolicy.DisableSSLVerification = true;
var documentDbClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
    masterKey: process.env.DOCUMENT_DB_KEY
}, connectionPolicy);
var companiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'companies');

exports.get_companies = function (req, res) {
    companiesDao.init().then((result) => {
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true',
            parameters: []
        };
        return companiesDao.findPromise(querySpec)
    }).then((rawCompanies) => {
        return companiesDao.cleanArray(rawCompanies);
    }).then((companies) => {
        res.json(companies);
    }).catch((error) => {
        res.json(new Error(1, 'Error querying companies.'));
    });
};

exports.get_company = function (req, res) {
    companiesDao.init().then((result) => {
        return companiesDao.getPromise(req.params.id.toLowerCase());
    }).then((rawCompany) => {
        if (rawCompany === undefined)
            throw new Error(404, 'The requested resource doesn\'t exist.');
        return companiesDao.cleanObject(rawCompany);
    }).then((company) => {
        res.json(company);
    }).catch((error) => {
        res.status(error.id).json(error);
    });
};

