var Location = require('./location');

var Property = class Property {
    constructor() {
        this.id = '';
        this.name = '';
        this.active = false;
        this.parent = '';
        this.location = new Location();
    }
}

module.exports = Property;