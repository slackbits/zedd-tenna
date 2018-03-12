'use strict';

const noble         = require('noble');


const AbstractBeaconScanner = require('./AbstractBeaconScanner');



class IBeaconScanner extends AbstractBeaconScanner {

    constructor(config) {
        this.init();
    }

    init() {
        
    }

    handlePacket(ibeacon) {

    }
}

module.exports = IBeaconScanner;