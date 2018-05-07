var Asset = class Asset {
    constructor() {
        this.id = '';
        this.type = -1;
        this.name = '';
		this.description = '';
        this.active = false;
        this.parent = '';
        this.bookingsMap = {};
        this.bookings = [];
        this.amenities = [];
		this.price = 0;
		this.currency = 'LAT';
    }
}

module.exports = Asset;