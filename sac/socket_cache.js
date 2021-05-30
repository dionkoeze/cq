const hash = require('object-hash')

class SocketCache {
    constructor(id, emitter) {
        this.id = id
        this.data_hash = 0
        this.status_hash = 0
        this.emitter = emitter
    }

    update_data(data) {
        const h = hash(data)
        if (h !== this.data_hash) {
            this.data_hash = h
            this.emitter.emit('data', {
                id: this.id,
                data
            })
        }
    }

    update_status(status) {
        const h = hash(status)
        if (h !== this.status_hash) {
            this.status_hash = h
            this.emitter.emit('status', {
                id: this.id,
                status
            })
        }
    }
}

module.exports = SocketCache