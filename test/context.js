const { Context } = require("../sac/context")
const events = require('events')
const hash = require('object-hash')

describe('Context', () => {
    let context, config, emitter, params

    function create_context() {
        return new Context(config, emitter, params)
    }

    beforeEach(() => {
        config = {
            name: 'context name',
            authorize(auth) {
                return hash(auth)
            },
        }

        emitter = new events.EventEmitter()

        params = {
            query: 'select all',
        }

        context = new Context(config, emitter, params)
    })

    describe('errors', () => {
        it('constructs error messages', () => {
            context.build_error('test type', Error('test message')).should.be.eql({
                type: 'test type',
                name: config.name,
                params,
                message: 'test message',
            })
        })
    })

    describe('creation and basics', () => {
        it('requires a config', () => {
            should(() => new Context()).throw('context requires a config object')
        })

        it('requires an authorize method on the config object', () => {
            should(() => new Context({name: 'test'})).throw('requires authorize method in config')
        })

        it('requires an emitter', () => {
            should(() => new Context({name: 'test', authorize: () => {}})).throw('context requires an emitter')
        })

        it('requires a name', () => {
            should(() => new Context({authorize: () => {}}, emitter)).throw('context requires a name in the config object')
        })

        it('has a name', () => {
            context.name.should.be.exactly(config.name)
        })

        it('has params', () => {
            context.params.should.be.eql(params)
        })

        it('has an id based on name and params', () => {
            context.should.have.property('id')
        })

        it('checks if params are valid', () => {
            let called = false

            config.is_valid = () => called = true

            create_context()

            called.should.be.true()
        })

        it('fails when params are not valid', () => {
            config.is_valid = () => {throw Error('invalid params')}

            // node crashes with unhandled exception if there is no listener
            emitter.on('error', () => {})

            should(create_context).throw('invalid params')
        })

        it('calls init method of the config object', () => {
            let called = false

            config.init = (update_data, update_status, close) => {
                called = true
                should(update_data).not.be.undefined()
                should(update_status).not.be.undefined()
                should(close).not.be.undefined()
                should(typeof update_data).be.exactly('function')
                should(typeof update_status).be.exactly('function')
                should(typeof close).be.exactly('function')
            }

            create_context()

            called.should.be.true()
        })
    })
    
    describe('joining sockets', () => {
        it('calls authorize method on config object', async () => {
            let called = false

            config.authorize = () => called = true

            await context.join('sid', 'auth')

            called.should.be.true()
        })

        it('calls can_join method on config object', async () => {
            let called = false

            config.authorize = () => called = true

            await context.join('sid', 'auth')

            called.should.be.true()
        })

        it('calls update_status on the context on successful connection', async () => {
            let called = false

            context.update_status = () => called = true

            await context.join('sid', 'auth')

            called.should.be.true()
        })
        
        it('calls the joined method of the config object on successful connection', async () => {
            let called = false
    
            config.joined = () => called = true
            
            await context.join('sid', 'auth')

            called.should.be.true()
        })

        it('multiple clients can join with one socket each', async () => {
            await context.join('sidA', 'authA')
            await context.join('sidB', 'authB')
            await context.join('sidC', 'authC')

            context.client_is_member(hash('authA')).should.be.true()
            context.client_is_member(hash('authB')).should.be.true()
            context.client_is_member(hash('authC')).should.be.true()
            context.socket_is_member('sidA').should.be.true()
            context.socket_is_member('sidB').should.be.true()
            context.socket_is_member('sidC').should.be.true()
        })

        it('one client can join with multiple sockets', async () => {
            await context.join('sidA', 'auth')
            await context.join('sidB', 'auth')
            await context.join('sidC', 'auth')

            context.client_is_member(hash('auth')).should.be.true()
            context.socket_is_member('sidA').should.be.true()
            context.socket_is_member('sidB').should.be.true()
            context.socket_is_member('sidC').should.be.true()
        })
        
        it('fails on bad auth', async () => {
            config.authorize = () => {throw Error('invalid password')}

            let errored = false

            emitter.on('error', (err) => {
                errored = true
                err.should.have.property('type', 'unauthorized')
                err.should.have.property('name', config.name)
                err.should.have.property('params', params)
                err.should.have.property('message', 'invalid password')
            })

            await context.join('sid', 'auth')

            errored.should.be.true()
        })
        
        it('fails if config does not allow user to join', async () => {
            config.can_join = () => {throw Error('context full')}

            let errored = false

            emitter.on('error', (err) => {
                errored = true
                err.should.have.property('type', 'not allowed')
                err.should.have.property('name', config.name)
                err.should.have.property('params', params)
                err.should.have.property('message', 'context full')
            })

            await context.join('sid', 'auth')

            errored.should.be.true()
        })
    })

    describe('updating data', () => {
        beforeEach(async () => {
            await context.join('sidA', 'authA')
            await context.join('sidB', 'authA')
            await context.join('sidC', 'authB')
        })

        it('sends updated data to all sockets', () => {
            emitter.on('data')

            await context.update_data()

            // THE EMITTER HAS NO SOCKET DESTINATION?!
            
        })

        it('sends updated data only to sockets that are behind')
    })

    describe('updating status', () => {

    })

    describe('leaving sockets', () => {

    })

    describe('missing sockets', () => {

    })

    describe('closing contexts', () => {

    })

    describe('requests', () => {
        it('')
    })
})