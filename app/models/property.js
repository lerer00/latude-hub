var Location = require('./location');

var Property = class Property extends Location {
    constructor() {
        super();
        this.id = '';
        this.name = '';
        this.description = '';
        this.contractAddress = '';
        this.comments = [];
        this.availabilities = [];
    }
}

module.exports = Property;