const SocketCache = require('../sac/socket_cache')
const events = require('events')

describe('SocketCache', () => {
    let emitter, cache
    let data_emitted, status_emitted

    beforeEach(() => {
        emitter = new events.EventEmitter()
        cache = new SocketCache('123', emitter)
        data_emitted = 0
        status_emitted = 0
    })

    it('does not emit on creation', () => {
        emitter.on('data', () => {
            data_emitted += 1
        })

        emitter.on('status', () => {
            status_emitted += 1
        })

        new SocketCache('123', emitter)

        data_emitted.should.be.exactly(0)
        status_emitted.should.be.exactly(0)
    })

    it('emits when data changes', () => {
        emitter.on('data', (dest, data) => {
            data_emitted += 1
            dest.should.be.eql('123')
            data.should.be.eql('abc')
        })

        emitter.on('status', () => {
            status_emitted += 1
        })

        cache.update_data('abc')

        data_emitted.should.be.exactly(1)
        status_emitted.should.be.exactly(0)
    })

    it('does not emit when same data is given', () => {
        emitter.on('data', (dest, data) => {
            data_emitted += 1
            dest.should.be.eql('123')
            data.should.be.eql('abc')
        })

        emitter.on('status', () => {
            status_emitted += 1
        })

        cache.update_data('abc')
        cache.update_data('abc')

        data_emitted.should.be.exactly(1)
        status_emitted.should.be.exactly(0)
    })

    it('emits when different data is given', () => {
        emitter.on('data', data => {
            data_emitted += 1
        })

        emitter.on('status', () => {
            status_emitted += 1
        })

        cache.update_data('abc')
        cache.update_data('abc')
        cache.update_data('abcd')

        data_emitted.should.be.exactly(2)
        status_emitted.should.be.exactly(0)
    })

    it('emits when status changes', () => {
        emitter.on('data', () => {
            data_emitted += 1
        })

        emitter.on('status', (dest, status) => {
            status_emitted += 1
            dest.should.be.eql('123')
            status.should.be.eql('abc')
        })

        cache.update_status('abc')

        data_emitted.should.be.exactly(0)
        status_emitted.should.be.exactly(1)
    })

    it('does not emit when same status is given', () => {
        emitter.on('data', () => {
            data_emitted += 1
        })

        emitter.on('status', (dest, status) => {
            status_emitted += 1
            dest.should.be.eql('123')
            status.should.be.eql('abc')
        })

        cache.update_status('abc')
        cache.update_status('abc')

        data_emitted.should.be.exactly(0)
        status_emitted.should.be.exactly(1)
    })

    it('emits when different status is given', () => {
        emitter.on('data', () => {
            data_emitted += 1
        })

        emitter.on('status', status => {
            status_emitted += 1
        })

        cache.update_status('abc')
        cache.update_status('abc')
        cache.update_status('abcd')

        data_emitted.should.be.exactly(0)
        status_emitted.should.be.exactly(2)
    })
})