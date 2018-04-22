var Asset = class Asset {
    constructor() {
        this.id = '';
        this.name = '';
		this.description = '';
        this.active = false;
        this.parent = '';
        this.staysMap = {};
        this.stays = [];
        this.amenities = [];
		this.price = 0;
		this.currency = 'LAT';
    }
}

module.exports = Asset;