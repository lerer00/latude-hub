var fs = require("fs");
const { DocumentClient, DocumentBase } = require('documentdb')
const TaskDao = require('../models/taskDao');

function Populate() {
    const connectionPolicy = new DocumentBase.ConnectionPolicy();
    connectionPolicy.DisableSSLVerification = true;
    var documentClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
        masterKey: process.env.DOCUMENT_DB_KEY
    }, connectionPolicy);

    // get/create the wanted database/collection companies client
    this.companiesDao = new TaskDao(documentClient, process.env.DOCUMENT_DB_DATABASE_ID, 'companies');
    this.companiesDao.init();

    // get/create the wanted database/collection properties client
    this.propertiesDao = new TaskDao(documentClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');
    this.propertiesDao.init();

    // get/create the wanted database/collection assets client
    this.assetsDao = new TaskDao(documentClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');
    this.assetsDao.init();
}

Populate.prototype.assets = function (path, dao) {
    fs.readdir(path, (err, files) => {
        files.forEach(file => {
            var asset = fs.readFileSync(path + file);
            dao.insertPromise(JSON.parse(asset)).then((asset) => {
                console.log('Asset is successfully added.');
            }).catch((error) => {
                if (error.code == 409)
                    console.log('Asset is already added.');
                else
                    console.log(error);
            });
        });
    });
}

// export the class
module.exports = Populate;