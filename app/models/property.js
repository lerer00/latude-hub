var Amenities = require('./amenities');
var Location = require('./location');
var Comment = require('./comment');

var Property = class Property {
    constructor() {
        this.id = '';
        this.name = '';
        this.description = '';
        this.rating = 0;
        this.comments = [];
        this.images = [];
        this.amenities = new Amenities();
        this.active = false;
        this.location = new Location();
    }
}

module.exports = Property;