const Web3 = require('web3');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');
const uuidv4 = require('uuid/v4');
const Property = require('../models/property');
const Company = require('../models/company');

// constructor
function Listener() {
    this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    this.lastBlockInspected = -1;

    var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
        masterKey: process.env.DOCUMENT_DB_KEY
    });

    // get/create the wanted database/collection properties tclient
    this.propertiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');
    this.propertiesDao.init();

    // get/create the wanted database/collection compagnies client
    this.compagniesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'compagnies');
    this.compagniesDao.init();

    // get/create the wanted database/collection assets client
    this.assetsDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');
    this.assetsDao.init();

    // company factory instance
    var companyFactoryAbi = require('../../build/contracts/CompanyFactory.json').abi;
    this.companyFactoryInstance = new this.web3.eth.Contract(companyFactoryAbi, process.env.COMPAGNIES_FACTORY_CONTRACT_ADDRESS);
}

// class methods
Listener.prototype.updateAvailabilities = function () {
    this.web3.eth.getBlockNumber().then(
        (number) => {
            console.log('latest block mined: ' + number);

            while (this.lastBlockInspected < number) {
                this.lastBlockInspected++;
                this.analyzeTransactionsOnBlock(this.lastBlockInspected);
            }
        })
};

Listener.prototype.analyzeTransactionsOnBlock = function (number) {
    var self = this;
    console.log('analyzing transactions on block: ' + number);
    this.web3.eth.getBlock(number).then(
        (block) => {
            if (block !== null || block !== undefined) {
                block.transactions.forEach((transactionHash) => {
                    console.log('inspecting transaction: ', transactionHash);
                    this.web3.eth.getTransaction(transactionHash).then((transaction) => {
                        if (transaction.to !== null && transaction.to.toLowerCase() === process.env.COMPAGNIES_FACTORY_CONTRACT_ADDRESS) {
                            console.log('company creation request from address: ' + transaction.from);
                            this.companyFactoryInstance.methods.getCompanies().call({ from: transaction.from }, function (error, result) {
                                console.log('compagnies own by address: ' + transaction.from + ' are [' + result + ']');
                                result.forEach((company) => {
                                    self.persistCompanyIntoStorage(company.toLowerCase());
                                })
                            });
                        }
                    });
                });
            }
        }
    );
}

Listener.prototype.persistCompanyIntoStorage = function (id) {
    var company = new Company();
    company.id = id;
    this.compagniesDao.insert(company, (error, document) => {
        console.log('inserting company: ' + id);
        if (error !== null)
            console.log('error while inserting company: ' + id, error);
        else
            console.log(document);
    });
}

// export the class
module.exports = Listener;