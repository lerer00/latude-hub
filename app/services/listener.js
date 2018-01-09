const Web3 = require('web3');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');
const uuidv4 = require('uuid/v4');
const colors = require('colors');
const Property = require('../models/property');
const Company = require('../models/company');

var companyFactoryAbi = require('../../build/contracts/CompanyFactory.json').abi;
var companyAbi = require('../../build/contracts/Company.json').abi;

// constructor
function Listener() {
    this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    this.lastBlockInspected = 0;

    var documentDbClient = new DocumentDbClient(process.env.DOCUMENT_DB_HOST, {
        masterKey: process.env.DOCUMENT_DB_KEY
    });

    // get/create the wanted database/collection properties tclient
    this.propertiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');
    this.propertiesDao.init();

    // get/create the wanted database/collection companies client
    this.companiesDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'companies');
    this.companiesDao.init();

    // get/create the wanted database/collection assets client
    this.assetsDao = new TaskDao(documentDbClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');
    this.assetsDao.init();

    // keep track of what companies, properties, assets and booking are already added.
    this.footsteps = {
        companies: {},
        properties: {},
        assets: {},
        bookings: {}
    }

    // company factory instance
    this.companyFactoryInstance = new this.web3.eth.Contract(companyFactoryAbi, process.env.COMPANY_FACTORY_CONTRACT_ADDRESS);
}

// class methods
Listener.prototype.catchUp = function () {
    console.log(colors.cyan('[i] catching up!'));

    this.web3.eth.getBlockNumber()
        .then((number) => {
            console.log(colors.cyan('[i] fetching past events up to current block: ' + number + '.'));
            if (number === this.lastBlockInspected)
                return;

            return this.companyFactoryInstance.getPastEvents('CompanyCreated', {
                fromBlock: this.lastBlockInspected,
                toBlock: number
            });
        }).then((events) => {
            console.log(colors.cyan('[i] persisting companies into storage.'))
            let promises = [];
            events.forEach(event => {
                this.lastBlockInspected = Math.max(event.blockNumber, this.lastBlockInspected);
                promises.push(this.persistCompanyIntoStorage(event));
            });
            return Promise.all(promises);
        }).then((results) => {
            results.forEach(result => {
                console.log(result.message);
            });

            console.log(colors.cyan('[i] fetching properties for known companies.'));
            var querySpec = {
                query: 'SELECT * FROM root r WHERE r.active = true',
                parameters: []
            };
            return this.companiesDao.findPromise(querySpec);
        }).then((companies) => {
            let promises = [];
            companies.forEach(company => {
                promises.push(this.getPropertiesFromCompanyContract(company.id));
            });
            return Promise.all(promises);
        }).then((results) => {
            console.log(colors.cyan('[i] persisting properties into storage.'))
            let promises = [];
            results.forEach(properties => {
                properties.forEach(event => {
                    promises.push(this.persistPropertyIntoStorage(event));
                })
            });
            return Promise.all(promises);
        }).then((results) => {
            results.forEach(result => {
                console.log(result.message);
            });

            console.log(colors.cyan('[i] fetching assets for known properties.'));
            var querySpec = {
                query: 'SELECT * FROM root r WHERE r.active = true',
                parameters: []
            };
            return this.propertiesDao.findPromise(querySpec);
        }).then((properties) => {
            let promises = [];
            properties.forEach(property => {
                promises.push(this.getAssetsFromCompanyContract(property.id));
            });
            return Promise.all(promises);
        }).then((results) => {
            console.log(colors.cyan('[i] persisting assets into storage.'))
            console.log(results);
        }).catch((error) => {
            console.log(colors.red('[e] error catching up, ' + error));
        }).finally(() => {
            console.log(colors.cyan('[i] we did catch up!'));
        });
};

Listener.prototype.getPropertiesFromCompanyContract = function (address) {
    return new Promise((resolve, reject) => {
        var companyInstance = new this.web3.eth.Contract(companyAbi, address);
        // last block is causing error since it's already updated.
        resolve(companyInstance.getPastEvents('PropertyCreated', {
            fromBlock: this.lastBlockInspected,
            toBlock: 'latest'
        }));
    });
}

Listener.prototype.getAssetsFromPropertyContract = function (address) {
    return new Promise((resolve, reject) => {
        var companyInstance = new this.web3.eth.Contract(companyAbi, address);
        // last block is causing error since it's already updated.
        resolve(companyInstance.getPastEvents('PropertyCreated', {
            fromBlock: this.lastBlockInspected,
            toBlock: 'latest'
        }));
    });
}

Listener.prototype.persistCompanyIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var companyAddress = event.returnValues.company;
        if (this.footsteps.companies[companyAddress]) {
            resolve({ code: 1, message: colors.yellow('[w] company ' + company + ' already exist.') })
        }

        var company = new Company();
        company.id = companyAddress;
        company.active = true;
        this.companiesDao.insert(company, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: colors.yellow('[w] company ' + companyAddress + ' already exist.') })
                    this.footsteps.companies[companyAddress] = true;
                } else {
                    reject({ code: 0, message: colors.red('[e] error while inserting company: ' + companyAddress + '.') });
                }
            }
            else {
                resolve({ code: 1, message: colors.green('[u] company ' + companyAddress + ' was inserted successfully.') })
                this.footsteps.companies[companyAddress] = true;
            }
        });
    });
}

Listener.prototype.persistPropertyIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var companyAddress = event.address;
        var propertyAddress = event.returnValues.property;
        if (this.footsteps.properties[propertyAddress]) {
            resolve({ code: 1, message: colors.yellow('[w] property ' + propertyAddress + ' already exist.') })
        }

        var property = new Property();
        property.id = propertyAddress;
        property.parent = companyAddress;
        property.active = true;
        this.propertiesDao.insert(property, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: colors.yellow('[w] property ' + propertyAddress + ' already exist.') })
                    this.footsteps.properties[companyAddress] = true;
                } else {
                    reject({ code: 0, message: colors.red('[e] error while inserting property: ' + propertyAddress + '.') });
                }
            }
            else {
                resolve({ code: 1, message: colors.green('[u] property ' + propertyAddress + ' was inserted successfully.') })
                this.footsteps.properties[companyAddress] = true;
            }
        });
    });
}

Listener.prototype.persistCompanyIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var companyAddress = event.returnValues.company;
        if (this.footsteps.companies[companyAddress]) {
            resolve({ code: 1, message: colors.yellow('[w] company ' + id + ' already exist.') })
        }

        var company = new Company();
        company.id = companyAddress;
        company.active = true;
        this.companiesDao.insert(company, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: colors.yellow('[w] company ' + companyAddress + ' already exist.') })
                    this.footsteps.companies[companyAddress] = true;
                } else {
                    reject({ code: 0, message: colors.red('[e] error while inserting company: ' + companyAddress + '.') });
                }
            }
            else {
                resolve({ code: 1, message: colors.green('[u] company ' + companyAddress + ' was inserted successfully.') })
                this.footsteps.companies[companyAddress] = true;
            }
        });
    });
}

Listener.prototype.updateAvailabilities = function () {
    // this.web3.eth.getBlockNumber()
    //     .then((number) => {
    //         console.log(colors.cyan('[i] Latest block: ' + number));
    //         if (number === this.lastBlockInspected)
    //             return;

    //         return this.companyFactoryInstance.getPastEvents('CompanyCreated', {
    //             fromBlock: this.lastBlockInspected,
    //             toBlock: number
    //         });
    //     }).then((events) => {

    //     }).catch(() => {
    //         console.log('Catch callback!');
    //     }).finally(() => {
    //         console.log('Final callback!');
    //     })
};

Listener.prototype.extractPropertiesFromCompany = function (id) {
    // company instance
    var companyInstance = new this.web3.eth.Contract(companyAbi, id);
    companyInstance.methods.getProperties().call(function (error, result) {
        console.log(colors.cyan('[i] Properties own by company: ' + id + ' are [' + result + ']'));
    });
}

// export the class
module.exports = Listener;