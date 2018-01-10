const Web3 = require('web3');
const DocumentDbClient = require('documentdb').DocumentClient;
const TaskDao = require('../models/taskDao');
const uuidv4 = require('uuid/v4');
const colors = require('colors');
const Company = require('../models/company');
const Property = require('../models/property');
const Asset = require('../models/asset');

var companyFactoryAbi = require('../../build/contracts/CompanyFactory.json').abi;
var companyAbi = require('../../build/contracts/Company.json').abi;
var propertyAbi = require('../../build/contracts/Property.json').abi;

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
Listener.prototype.catchUp = function (fromBlock) {
    this.web3.eth.getBlockNumber()
        .then((number) => {
            console.log(colors.cyan('[i] fetching past events to block: ' + number + '.'));
            if (number === this.lastBlockInspected)
                throw colors.yellow('[w] block already inspected.');

            // Knowing that this block is mined every events will be taken from this point on.
            this.lastBlockInspected = number;

            return this.companyFactoryInstance.getPastEvents('CompanyCreated', {
                fromBlock: fromBlock,
                toBlock: 'latest'
            });
        }).then((events) => {
            console.log(colors.cyan('[i] persisting companies into storage.'))
            let promises = [];
            events.forEach(event => {
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
                promises.push(this.getPropertiesFromCompanyContract(fromBlock, company.id));
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
                promises.push(this.getAssetsFromPropertyContract(fromBlock, property.id));
            });
            return Promise.all(promises);
        }).then((results) => {
            console.log(colors.cyan('[i] persisting assets into storage.'))
            let promises = [];
            results.forEach(assets => {
                assets.forEach(event => {
                    promises.push(this.persistAssetIntoStorage(event));
                })
            });
            return Promise.all(promises);
        }).then((results) => {
            results.forEach(result => {
                console.log(result.message);
            });
        }).catch((error) => {
            console.log(error);
        }).finally(() => {
            console.log(colors.cyan('[i] we did catch up!'));
        });
};

Listener.prototype.getPropertiesFromCompanyContract = function (fromBlock, address) {
    return new Promise((resolve, reject) => {
        var companyInstance = new this.web3.eth.Contract(companyAbi, address);
        // last block is causing error since it's already updated.    
        resolve(companyInstance.getPastEvents('PropertyCreated', {
            fromBlock: fromBlock,
            toBlock: 'latest'
        }));
    });
}

Listener.prototype.getAssetsFromPropertyContract = function (fromBlock, address) {
    return new Promise((resolve, reject) => {
        var propertyInstance = new this.web3.eth.Contract(propertyAbi, address);
        // last block is causing error since it's already updated.
        resolve(propertyInstance.getPastEvents('AssetCreated', {
            fromBlock: fromBlock,
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
                    this.footsteps.properties[propertyAddress] = true;
                } else {
                    reject({ code: 0, message: colors.red('[e] error while inserting property: ' + propertyAddress + '.') });
                }
            }
            else {
                resolve({ code: 1, message: colors.green('[u] property ' + propertyAddress + ' was inserted successfully.') })
                this.footsteps.properties[propertyAddress] = true;
            }
        });
    });
}

Listener.prototype.persistAssetIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var propertyAddress = event.address;
        var assetAddress = event.returnValues.asset;
        if (this.footsteps.assets[assetAddress]) {
            resolve({ code: 1, message: colors.yellow('[w] asset ' + assetAddress + ' on property ' + propertyAddress + ' already exist.') })
        }

        var asset = new Asset();
        asset.id = propertyAddress + '&' + assetAddress;
        asset.parent = propertyAddress;
        asset.active = true;
        this.assetsDao.insert(asset, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: colors.yellow('[w] asset ' + assetAddress + ' on property ' + propertyAddress + ' already exist.') })
                    this.footsteps.assets[assetAddress] = true;
                } else {
                    reject({ code: 0, message: colors.red('[e] error while inserting asset: ' + assetAddress + ' on property ' + propertyAddress + '.') });
                }
            }
            else {
                resolve({ code: 1, message: colors.green('[u] asset ' + assetAddress + ' on property ' + propertyAddress + ' was inserted successfully.') })
                this.footsteps.assets[assetAddress] = true;
            }
        });
    });
}

Listener.prototype.listen = function () {
    this.catchUp(this.lastBlockInspected + 1);
};

// export the class
module.exports = Listener;