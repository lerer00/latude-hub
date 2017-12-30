const Web3 = require('web3');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');
const Property = require('../models/property');

// constructor
function Listener() {
    this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

    var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
        masterKey: process.env.DOCUMENT_DB_KEY
    });

    // get/create the wanted database/collection client
    this.taskDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');
    this.taskDao.init();
}

// class methods
Listener.prototype.updateAvailabilities = function () {
    // we need to check the latest mined block and check for transaction that are booking
    // we know that by checking for valid address (hash map) this hash map will need to be populated first
    var x = new Property();
    console.log(x);
    
    this.taskDao.insert({}, (asd) => {
        console.log('inserted', asd);
    })
};

// export the class
module.exports = Listener;