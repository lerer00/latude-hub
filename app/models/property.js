var Location = require('./location');

var Property = class Property extends Location {
    constructor() {
        super();
        this.id = '';
        this.name = '';
        this.active = false;
        this.parent = '';
    }
}

module.exports = Property;