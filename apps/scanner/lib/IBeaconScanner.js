'use strict';

const noble         = require('noble');
const KalmanFilter  = require('kalmanjs').default;


const AbstractBeaconScanner = require('./AbstractBeaconScanner');



class IBeaconScanner extends AbstractBeaconScanner {

    constructor(config) {
        super();

        this.config = config;
        this.channel = this.config.get('ble.channel');
        this.updateFreq = parseInt(this.config.get('ble.update_frequency'), 0);
        this.whitelist = this.config.get('ble.whitelist') || [];
        this.blacklist = this.config.get('ble.blacklist') || [];
        this.maxDistance = this.config.get('ble.max_distance') || 0;
        this.useMac = this.config.get('ble.use_mac');
        this.systemNoise = this.config.get('ble.system_noise') || 0.01;
        this.measuremeentNoise = this.config.get('ble.measurement_noise') || 3;


        this.lastUpdateTime = new Date();

        this.kalmanManager = {};
        this._init();

    }

    _init() {
        noble.on('stateChange', this._startScanning.bind(this));
        noble.on('discover', this._handlePacket.bind(this));        
    }

    _startScanning(state) {
        if (state === 'poweredOn') {
            noble.startScanning([], true);
        }
        else {
            noble.stopScanning();
        }
    }

    _handlePacket(peripheral) {
        if (this.updateFreq > 0) {
            let currTime = new Date();
            if ((currTime - this.lastUpdateTime) < this.updateFreq) {
                return;
            }
            this.lastUpdateTime = currTime;
        }
    
        let advertisement = peripheral.advertisement;
    
        let id;
        if (this.useMac) {
            id = peripheral.address;
        } else {
            id = peripheral.id;
        }
    
        // check if we have a whitelist or blacklist
        // and if we do, if this id is listed there
        if ((this.whitelist.length > 0 && this.whitelist.includes(id))
            || !(this.blacklist.length > 0 && this.blacklist.includes(id))) {
            // default hardcoded value for beacon tx power
            let txPower = advertisement.txPowerLevel || -59;
            let distance = this._calculateDistance(peripheral.rssi, txPower);
    
            // max distance parameter checking
            if (this.maxDistance == 0 || distance <= this.maxDistance) {
                let filteredDistance = this._filter(id, distance);
    
                let payload = {
                    id: id,
                    name: advertisement.localName,
                    rssi: peripheral.rssi,
                    distance: filteredDistance
                };
    
                //Fire an event
                this.emit("update", channel, payload);
            }
        }
    }

    _calculateDistance(rssi, txPower) {
        if (rssi == 0) {
            return -1.0;
        }
    
        var ratio = rssi * 1.0 / txPower;
        if (ratio < 1.0) {
            return Math.pow(ratio, 10);
        }
        else {
            return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
        }
    }
    
    _filter(id, distance) {
        if (!this.kalmanManager.hasOwnProperty(id)) {
            this.kalmanManager[id] = new KalmanFilter({
                R: this.systemNoise,
                Q: this.measuremeentNoise
            });
        }
    
        return this.kalmanManager[id].filter(distance);
    }
    
}

module.exports = IBeaconScanner;