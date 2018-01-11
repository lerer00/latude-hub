var Asset = class Asset {
    constructor() {
        this.id = '';
        this.name = '';
        this.active = false;
        this.parent = '';
        this.timezone = '';
        this.staysMap = {};
        this.stays = []
    }
}

module.exports = Asset;