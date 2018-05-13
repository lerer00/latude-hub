const Web3 = require('web3');
const { DocumentClient, DocumentBase } = require('documentdb')
const Helper = require('../utilities/helper');
const TaskDao = require('../models/taskDao');
const logger = require('heroku-logger')
const Property = require('../models/property');
const Asset = require('../models/asset');
const Booking = require('../models/booking');

var propertyFactoryAbi = require('latude-contracts/build/contracts/PropertyFactory.json').abi;
var propertyAbi = require('latude-contracts/build/contracts/Property.json').abi;

// constructor
function Listener() {
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_URL));
    this.lastBlockInspected = 0;

    // storage credentials
    const connectionPolicy = new DocumentBase.ConnectionPolicy();
    connectionPolicy.DisableSSLVerification = true;
    var documentClient = new DocumentClient(process.env.DOCUMENT_DB_HOST, {
        masterKey: process.env.DOCUMENT_DB_KEY
    }, connectionPolicy);

    // keep track of properties, assets that are already added
    this.footsteps = {
        properties: {},
        assets: {}
    }

    // property factory instance
    this.propertyFactoryInstance = new this.web3.eth.Contract(propertyFactoryAbi, process.env.PROPERTY_FACTORY_CONTRACT_ADDRESS);

    // get/create the wanted database/collection client
    this.propertiesDao = new TaskDao(documentClient, process.env.DOCUMENT_DB_DATABASE_ID, 'properties');
    this.assetsDao = new TaskDao(documentClient, process.env.DOCUMENT_DB_DATABASE_ID, 'assets');
}

// init
Listener.prototype.init = async function () {
    await this.propertiesDao.init()
    await this.assetsDao.init();
}

Listener.prototype.catchUp = async function (fromBlock) {
    // getting the latest mined block
    var latestBlock = await this.web3.eth.getBlockNumber();

    if (fromBlock >= latestBlock) {
        logger.warn('already up to date.');
        return;
    }

    logger.info('fetching past events from block ' + fromBlock + ' to block: ' + latestBlock + '.');

    // set the last block inspected to the current block 
    this.lastBlockInspected = latestBlock;

    var hex = '';
        for (var i = 0; i < 'CAD'.length; i++) { hex += '' + 'CAD'.charCodeAt(i).toString(16); }

    this.propertyFactoryInstance.getPastEvents('PropertyCreated', {
        fromBlock: fromBlock,
        toBlock: 'latest'
    }).then((events) => {
        logger.info('persisting properties into storage.');
        let promises = [];
        events.forEach(event => {
            promises.push(this.persistPropertyIntoStorage(event));
        });
        return Promise.all(promises);
    }).then((results) => {
        results.forEach(result => {
            if (result.code <= 0) {
                logger.error(result.message);
            } else {
                logger.info(result.message);
            }
        });

        logger.info('fetching assets for known properties.');
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
        logger.info('persisting assets into storage.');
        let promises = [];
        results.forEach(assets => {
            assets.forEach(event => {
                promises.push(this.persistAssetIntoStorage(event));
            })
        });
        return Promise.all(promises);
    }).then((results) => {
        results.forEach(result => {
            if (result.code <= 0) {
                logger.error(result.message);
            } else {
                logger.info(result.message);
            }
        });

        logger.info('fetching bookings for known properties.');
        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.active = true',
            parameters: []
        };
        return this.propertiesDao.findPromise(querySpec);
    }).then((properties) => {
        let promises = [];
        properties.forEach(property => {
            promises.push(this.getBookingsFromPropertyContract(fromBlock, property.id));
        })
        return Promise.all(promises);
    }).then((results) => {
        logger.info('persisting bookings within storage.');
        let promises = [];
        results.forEach(bookings => {
            bookings.forEach(event => {
                promises.push(this.persistBookingIntoStorage(event));
            })
        });
        return Promise.all(promises);
    }).then((results) => {
        results.forEach(result => {
            if (result.code <= 0) {
                logger.error(result.message);
            } else {
                logger.info(result.message);
            }
        });
    }).catch((error) => {
        logger.error(error);
    }).finally(() => {
        logger.info('we did catch up!');
    });
};

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

Listener.prototype.getBookingsFromPropertyContract = function (fromBlock, address) {
    return new Promise((resolve, reject) => {
        var propertyInstance = new this.web3.eth.Contract(propertyAbi, address);
        // last block is causing error since it's already updated.
        resolve(propertyInstance.getPastEvents('BookingCreated', {
            fromBlock: fromBlock,
            toBlock: 'latest'
        }));
    });
}

Listener.prototype.persistPropertyIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var propertyAddress = event.returnValues.property.toLowerCase();
        if (this.footsteps.properties[propertyAddress]) {
            resolve({ code: 1, message: 'property ' + propertyAddress + ' already exist.' });
            return;
        }

        var property = new Property();
        property.id = propertyAddress;
        property.active = true;
        property.location.type = "Point";
        property.location.coordinates = [-122.12, 47.66];

        this.propertiesDao.insert(property, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: 'property ' + propertyAddress + ' already exist.' });
                    this.footsteps.properties[propertyAddress] = true;
                } else {
                    reject({ code: 0, message: 'error while inserting property: ' + propertyAddress + '.' });
                }
            }
            else {
                resolve({ code: 1, message: 'property ' + propertyAddress + ' was inserted successfully.' })
                this.footsteps.properties[propertyAddress] = true;
            }
        });
    });
}

Listener.prototype.persistAssetIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var propertyAddress = event.address.toLowerCase();
        var rawAssetId = event.returnValues.asset;
        var assetPrice = event.returnValues.price;
        var assetCurrency = Helper.toAscii(event.returnValues.currency);
        var assetId = propertyAddress + '&' + event.returnValues.asset;
        if (this.footsteps.assets[assetId]) {
            resolve({ code: 1, message: 'asset ' + rawAssetId + ' on property ' + propertyAddress + ' already exist.' });
            return;
        }

        var asset = new Asset();
        asset.id = assetId;
        asset.active = true;
        asset.parent = propertyAddress;
        asset.price = assetPrice;
        asset.currency = assetCurrency;
        asset.type = 0; // For now we are defaulting to a ROOM, this should be driven by the blockchain...
        this.assetsDao.insert(asset, (error, document) => {
            if (error !== null) {
                if (error.code == 409) {
                    resolve({ code: 1, message: 'asset ' + rawAssetId + ' on property ' + propertyAddress + ' already exist.' })
                    this.footsteps.assets[assetId] = true;
                } else {
                    reject({ code: 0, message: 'error while inserting asset: ' + rawAssetId + ' on property ' + propertyAddress + '.' });
                }
            }
            else {
                resolve({ code: 1, message: 'asset ' + rawAssetId + ' on property ' + propertyAddress + ' was inserted successfully.' })
                this.footsteps.assets[assetId] = true;
            }
        });
    });
}

Listener.prototype.persistBookingIntoStorage = function (event) {
    return new Promise((resolve, reject) => {
        var propertyAddress = event.address.toLowerCase();
        var assetId = event.returnValues.asset;
        var bookingId = event.returnValues.id;

        // fetch the current asset
        this.assetsDao.get(propertyAddress + '&' + event.returnValues.asset, (error, asset) => {
            if (error !== null) {
                if (error.code == 404) {
                    resolve({ code: 1, message: 'asset ' + assetId + ' on property ' + propertyAddress + ' cannot be found.' })
                    return;
                } else {
                    resolve({ code: 1, message: 'error while retreiving asset: ' + assetId + ' on property ' + propertyAddress + '.' });
                    return;
                }
            }

            if (asset.bookingsMap[bookingId]) {
                resolve({ code: 1, message: 'booking ' + bookingId + ' on asset ' + assetId + ' on property ' + propertyAddress + ' already exist.' })
                return;
            }

            // create the booking
            var booking = new Booking();
            booking.id = bookingId;
            booking.checkInUtc = bookingId;
            booking.duration = event.returnValues.duration;
            asset.bookings.push(booking);
            asset.bookingsMap[bookingId] = true;

            // update the asset with the new booking
            this.assetsDao.update(asset, (error, document) => {
                if (error !== null) {
                    reject({ code: 0, message: 'error while inserting booking: ' + bookingId + ' on asset ' + assetId + ' on property ' + propertyAddress + '.' });
                }
                else {
                    resolve({ code: 1, message: 'booking ' + bookingId + ' on asset ' + assetId + ' on property ' + propertyAddress + ' was inserted successfully.' })
                }
            });
        });
    });
}

Listener.prototype.listen = function () {
    this.catchUp(this.lastBlockInspected + 1);
};

// export the class
module.exports = Listener;