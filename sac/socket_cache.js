const hash = require('object-hash')

class SocketCache {
    constructor(id, emit) {
        this.id = id
        this.data_hash = 0
        this.status_hash = 0
        this.emit = emit
    }

    update_data(data) {
        const h = hash(data)
        if (h !== this.data_hash) {
            this.data_hash = h
            this.emit(this.id, 'data', data)
        }
    }

    update_status(status) {
        const h = hash(status)
        if (h !== this.status_hash) {
            this.status_hash = h
            this.emit(this.id, 'status', status)
        }
    }
}

module.exports = SocketCache