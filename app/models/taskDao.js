var DocumentDBClient = require('documentdb').DocumentClient;
var documentDbUtils = require('../utilities/documentDb');

function TaskDao(documentDBClient, databaseId, collectionId) {
    this.client = documentDBClient;
    this.databaseId = databaseId;
    this.collectionId = collectionId;

    this.database = null;
    this.collection = null;
}

TaskDao.prototype = {
    init: function (callback) {
        var self = this;

        documentDbUtils.getOrCreateDatabase(self.client, self.databaseId, function (err, db) {
            if (err) {
                callback(err);
            } else {
                self.database = db;
                documentDbUtils.getOrCreateCollection(self.client, self.database._self, self.collectionId, function (err, coll) {
                    if (err) {
                        callback(err);
                    } else {
                        self.collection = coll;
                    }
                });
            }
        });
    },

    init: function () {
        var self = this;
        return new Promise((resolve, reject) => {
            documentDbUtils.getOrCreateDatabase(self.client, self.databaseId, function (err, db) {
                if (err) {
                    reject(err);
                    return;
                } else {
                    self.database = db;
                    documentDbUtils.getOrCreateCollection(self.client, self.database._self, self.collectionId, function (err, coll) {
                        if (err) {
                            reject(err);
                        } else {
                            self.collection = coll;
                            resolve(true);
                        }
                    });
                }
            });
        });
    },

    find: function (querySpec, callback) {
        var self = this;

        self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results);
            }
        });
    },

    findPromise: function (querySpec) {
        var self = this;
        return new Promise((resolve, reject) => {
            self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    },

    insert: function (item, callback) {
        var self = this;

        self.client.createDocument(self.collection._self, item, function (err, doc) {
            if (err) {
                callback(err);
            } else {
                callback(null, doc);
            }
        });
    },

    update: function (item, callback) {
        var self = this;

        self.client.replaceDocument(item._self, item, function (err, replaced) {
            if (err) {
                callback(err);
            } else {
                callback(null, replaced);
            }
        });
    },

    get: function (itemId, callback) {
        var self = this;

        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.id = @id',
            parameters: [{
                name: '@id',
                value: itemId
            }]
        };

        self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results[0]);
            }
        });
    },

    getPromise: function (id) {
        var self = this;

        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.id = @id',
            parameters: [{
                name: '@id',
                value: id
            }]
        };

        return new Promise((resolve, reject) => {
            self.client.queryDocuments(self.collection._self, querySpec).toArray(function (error, results) {
                if (error) {
                    reject([]);
                } else {
                    resolve(results[0]);
                }
            });
        });
    },

    cleanArray: function (items) {
        return new Promise((resolve, reject) => {
            items.forEach(item => {
                delete item._rid;
                delete item._self;
                delete item._etag;
                delete item._attachments;
                delete item._ts;
            });

            resolve(items);
        });
    },

    cleanObject: function (item) {
        return new Promise((resolve, reject) => {
            delete item._rid;
            delete item._self;
            delete item._etag;
            delete item._attachments;
            delete item._ts;

            resolve(item);
        });
    }
};

module.exports = TaskDao;