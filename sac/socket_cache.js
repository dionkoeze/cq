const hash = require('object-hash')

class SocketCache {
    constructor(sid, id, emit) {
        this.sid = sid
        this.id = id
        this.data_hash = 0
        this.status_hash = 0
        this.emit = emit
    }

    update_data(data) {
        const h = hash(data)
        if (h !== this.data_hash) {
            this.data_hash = h
            this.emit(this.sid, 'data', {
                id: this.id ,
                data,
            })
        }
    }

    update_status(status) {
        const h = hash(status)
        if (h !== this.status_hash) {
            this.status_hash = h
            this.emit(this.sid, 'status', {
                id: this.id,
                status,
            })
        }
    }
}

module.exports = SocketCache