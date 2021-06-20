const { Context, context_id } = require("../sac/context")
const events = require('events')

describe('Context', () => {
    let context, config, emitter, reply, params, id

    function create_context() {
        return new Context(reply, config, emitter, params)
    }

    beforeEach(() => {
        config = {
            name: 'context name',
            authorize(auth) {
                return auth
            },
        }

        emitter = new events.EventEmitter()

        params = {
            query: 'select all',
        }

        // reply = {
        //     success: () => {},
        //     error: () => {},
        // }
        
        reply = () => {}

        id = context_id(config.name, params)

        context = new Context(reply, config, emitter, params)
    })

    describe('replies', () => {
        it('constructs error messages', () => {
            context.build_error('test type', Error('test message')).should.be.eql({
                success: false,
                type: 'test type',
                name: config.name,
                params,
                id,
                message: 'test message',
            })
        })

        it('constructs success messages', () => {
            context.build_success('test type', 'test message').should.be.eql({
                success: true,
                type: 'test type',
                name: config.name,
                params,
                id,
                message: 'test message',
            })
        })
    })

    describe('creation and basics', () => {
        it('requires a config', () => {
            should(() => new Context(reply)).throw('context requires a config object')
        })

        it('requires an authorize method on the config object', () => {
            should(() => new Context(reply, {name: 'test'})).throw('requires authorize method in config')
        })

        it('requires an emitter', () => {
            should(() => new Context(reply, {name: 'test', authorize: () => {}})).throw('context requires an emitter')
        })

        it('requires a name', () => {
            should(() => new Context(reply, {authorize: () => {}}, emitter)).throw('context requires a name in the config object')
        })

        it('has a name', () => {
            context.name.should.be.exactly(config.name)
        })

        it('has params', () => {
            context.params.should.be.eql(params)
        })

        it('is initially empty', () => {
            context.empty.should.be.true()
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

        it('notifies socket when params are not valid', () => {
            config.is_valid = () => {throw Error('invalid params')}

            let errored = false
            reply = (err) => {
                errored = true
                err.should.have.property('success', false)
                err.should.have.property('type', 'invalid params')
                err.should.have.property('name', config.name)
                err.should.have.property('params', params)
                err.should.have.property('id', id)
                err.should.have.property('message', 'invalid params')
            }

            // node crashes with unhandled exception if there is no listener
            emitter.on('error', () => {})

            try{
                create_context()
            } catch(err) {
                // only catch the expected invalid params exception
                if (err.message != 'invalid params') {
                    throw err
                }
            }

            errored.should.be.true()
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

        // it('notifies socket of success', () => {
        //     let called = false
        //     reply = (msg) => {
        //         called = true
        //         msg.should.have.property('success', true)
        //         msg.should.have.property('type', 'context created')
        //         msg.should.have.property('name', config.name)
        //         msg.should.have.property('params', params)
        //         msg.should.have.property('id', id)
        //         msg.should.have.property('message', 'context created')
        //     }

        //     create_context()

        //     called.should.be.true()
        // })
    })
    
    describe('joining sockets', () => {
        it('calls authorize method on config object', async () => {
            let called = false

            config.authorize = () => called = true

            await context.join(reply, 'sid', 'auth')

            called.should.be.true()
        })

        it('calls can_join method on config object', async () => {
            let called = false

            config.authorize = () => called = true

            await context.join(reply, 'sid', 'auth')

            called.should.be.true()
        })

        it('calls update_status on the context on successful connection', async () => {
            let called = false

            context.update_status = () => called = true

            await context.join(reply, 'sid', 'auth')

            called.should.be.true()
        })
        
        it('calls the joined method of the config object on successful connection', async () => {
            let called = false
    
            config.joined = () => called = true
            
            await context.join(reply, 'sid', 'auth')

            called.should.be.true()
        })

        it('notifies socket of success', async () => {
            let called = false

            reply = (msg) => {
                called = true
                msg.should.have.property('success', true)
                msg.should.have.property('type', 'joined context')
                msg.should.have.property('name', config.name)
                msg.should.have.property('params', params)
                msg.should.have.property('id', id)
                msg.should.have.property('message', 'joined context')
            }

            await context.join(reply, 'sid', 'auth')
        })

        it('multiple clients can join with one socket each', async () => {
            await context.join(reply, 'sidA', 'authA')
            await context.join(reply, 'sidB', 'authB')
            await context.join(reply, 'sidC', 'authC')

            context.client_is_member('authA').should.be.true()
            context.client_is_member('authB').should.be.true()
            context.client_is_member('authC').should.be.true()
            context.socket_is_member('sidA').should.be.true()
            context.socket_is_member('sidB').should.be.true()
            context.socket_is_member('sidC').should.be.true()
        })

        it('one client can join with multiple sockets', async () => {
            await context.join(reply, 'sidA', 'auth')
            await context.join(reply, 'sidB', 'auth')
            await context.join(reply, 'sidC', 'auth')

            context.client_is_member('auth').should.be.true()
            context.socket_is_member('sidA').should.be.true()
            context.socket_is_member('sidB').should.be.true()
            context.socket_is_member('sidC').should.be.true()
        })

        it('is not empty when a socket has joined', async () => {
            await context.join(reply, 'sid', 'auth')

            context.empty.should.be.false()
        })
        
        it('fails on bad auth', async () => {
            config.authorize = () => {throw Error('invalid password')}

            let errored = false

            reply = (err) => {
                errored = true
                err.should.have.property('success', false)
                err.should.have.property('type', 'unauthorized')
                err.should.have.property('name', config.name)
                err.should.have.property('params', params)
                err.should.have.property('id', id)
                err.should.have.property('message', 'invalid password')
            }

            await context.join(reply, 'sid', 'auth')

            errored.should.be.true()
        })
        
        it('fails if config does not allow user to join', async () => {
            config.can_join = () => {throw Error('context full')}

            let errored = false

            reply = (err) => {
                errored = true
                err.should.have.property('success', false)
                err.should.have.property('type', 'not allowed')
                err.should.have.property('name', config.name)
                err.should.have.property('params', params)
                err.should.have.property('id', id)
                err.should.have.property('message', 'context full')
            }

            await context.join(reply, 'sid', 'auth')

            errored.should.be.true()
        })
    })

    describe('updating data', () => {
        beforeEach(async () => {
            await context.join(reply, 'sidA', 'authA')
            await context.join(reply, 'sidB', 'authA')
            await context.join(reply, 'sidC', 'authB')
        })

        it('calls the data method of the config object', async () => {
            let called = false

            config.data = () => called = true

            await context.update_data()

            called.should.be.true()
        })

        it('sends updated data to all sockets', async () => {
            let Acalled = 0, Bcalled = 0, Ccalled = 0

            emitter.on('data', (dest, data) => {
                if (dest === 'sidA') Acalled += 1
                if (dest === 'sidB') Bcalled += 1
                if (dest === 'sidC') Ccalled += 1
                data.should.be.exactly('test data')
            })

            config.data = () => 'test data'

            // to test caching the second update this is called twice
            await context.update_data()
            await context.update_data()

            Acalled.should.be.exactly(1)
            Bcalled.should.be.exactly(1)
            Ccalled.should.be.exactly(1)
        })

        it('sends updated data only to sockets that are behind', async () => {
            config.data = () => 'test data'

            await context.update_data()

            let Acalled = 0, Bcalled = 0, Ccalled = 0, Dcalled = 0

            emitter.on('data', (dest, data) => {
                if (dest === 'sidA') Acalled += 1
                if (dest === 'sidB') Bcalled += 1
                if (dest === 'sidC') Ccalled += 1
                if (dest === 'sidD') Dcalled += 1
                data.should.be.exactly('test data')
            })

            await context.join(reply, 'sidD', 'authD')

            // to test caching the second update this is called twice
            await context.update_data()
            await context.update_data()

            Acalled.should.be.exactly(0)
            Bcalled.should.be.exactly(0)
            Ccalled.should.be.exactly(0)
            Dcalled.should.be.exactly(1)
        })
    })

    describe('updating status', () => {
        beforeEach(async () => {
            await context.join(reply, 'sidA', 'authA')
            await context.join(reply, 'sidB', 'authA')
            await context.join(reply, 'sidC', 'authB')
        })

        it('calls the status method of the config object', async () => {
            let called = false
            
            config.status = () => called = true
            
            await context.update_status()
            
            called.should.be.true()
        })

        it('sends updated status to all sockets', async () => {
            config.status = clients => clients
            
            let Acalled = 0, Bcalled = 0, Ccalled = 0
            
            emitter.on('status', (dest, status) => {
                if (dest === 'sidA') Acalled += 1
                if (dest === 'sidB') Bcalled += 1
                if (dest === 'sidC') Ccalled += 1
                status.should.be.eql(['authA', 'authB'])
            })
            
            // to test caching the second update this is called twice
            await context.update_status()
            await context.update_status()

            Acalled.should.be.exactly(1)
            Bcalled.should.be.exactly(1)
            Ccalled.should.be.exactly(1)
        })

        it('sends update status only to sockets that are behind', async () => {
            config.status = clients => 'status'

            await context.update_status()

            let Acalled = 0, Bcalled = 0, Ccalled = 0, Dcalled = 0

            emitter.on('status', (dest, status) => {
                if (dest === 'sidA') Acalled += 1
                if (dest === 'sidB') Bcalled += 1
                if (dest === 'sidC') Ccalled += 1
                if (dest === 'sidD') Dcalled += 1
                status.should.be.eql('status')
            })

            await context.join(reply, 'sidD', 'authD')

            // to test caching the second update this is called twice
            await context.update_data()
            await context.update_data()

            Acalled.should.be.exactly(0)
            Bcalled.should.be.exactly(0)
            Ccalled.should.be.exactly(0)
            Dcalled.should.be.exactly(1)
        })
    })

    describe('requests', () => {
        it('calls the appropriate handler of the config object with parameters', async () => {
            let called = false

            config.requests = {}
            config.requests.create = (params) => {
                called = true
                params.should.be.eql({par: 'ams'})
            }

            await context.handle_request(reply, {name: 'create', params: {par: 'ams'}})

            called.should.be.true()
        })

        it('replies with an error if handler does not exist', async () => {
            config.requests = {}

            let errored = false

            reply = (err) => {
                errored = true
                err.should.eql({
                    success: false,
                    type: 'illegal request',
                    name: config.name,
                    params,
                    id,
                    message: 'no known handler for this request'
                })
            }

            await context.handle_request(reply, {name: 'create'})

            errored.should.be.true()
        })

        it('replies with an error if no request handlers are registered', async () => {
            let errored = false

            reply = (err) => {
                errored = true
                err.should.eql({
                    success: false,
                    type: 'illegal request',
                    name: config.name,
                    params,
                    id,
                    message: 'no known handler for this request'
                })
            }

            await context.handle_request(reply, {name: 'create'})

            errored.should.be.true()
        })

        it('replies with an error if name is not a string', async () => {
            let errored = false

            reply = (err) => {
                errored = true
                err.should.eql({
                    success: false,
                    type: 'illegal request',
                    name: config.name,
                    params,
                    id,
                    message: 'request name should be a string'
                })
            }

            await context.handle_request(reply, {name: 123})

            errored.should.be.true()
        })

        it('replies with success if handler does not throw', async () => {
            let called = false

            config.requests = {}
            config.requests.create = () => ['this', 'is', 'the', 'reply']

            reply = (msg) => {
                called = true
                msg.should.be.eql({
                    success: true,
                    type: 'reply',
                    name: config.name,
                    params,
                    id,
                    message: ['this', 'is', 'the', 'reply'],
                })
            }

            await context.handle_request(reply, {name: 'create'})

            called.should.be.true()
        })
        
        it('replies with an error if handler throws', async () => {
            let called = false

            config.requests = {}
            config.requests.create = () => {throw Error('handler error')}

            reply = (msg) => {
                called = true
                msg.should.be.eql({
                    success: false,
                    type: 'handler error',
                    name: config.name,
                    params,
                    id,
                    message: 'handler error',
                })
            }

            await context.handle_request(reply, {name: 'create'})

            called.should.be.true()
        })

        it('emits data and status before replying', async () => {
            let replied = false, updated_data = false, updated_status = false

            await context.join(reply, 'sid', 'auth')
            
            config.data = () => new Promise((res, _) => res(replied))
            config.status = (clients) => new Promise((res, _) => res(clients))

            config.requests = {}
            config.requests.create = () => 'created!'

            reply = (msg) => {
                replied = true
                updated_data.should.be.true()
                updated_status.should.be.true()
            }

            emitter.on('data', (dest, data) => {
                updated_data = true
                replied.should.be.false()
            })

            emitter.on('status', (dest, status) => {
                updated_status = true
                replied.should.be.false()
            })

            await context.handle_request(reply, {name: 'create'})

            replied.should.be.true()
            updated_data.should.be.true()
            updated_status.should.be.true()
        })
    })

    describe('leaving sockets', () => {
        beforeEach(async () => {
            await context.join(reply, 'sidA', 'authA')
            await context.join(reply, 'sidB', 'authA')
            await context.join(reply, 'sidC', 'authB')
        })
        
        it('is empty when all sockets have left', async () => {
            await context.leave(reply, 'sidA')
            await context.leave(reply, 'sidB')
            await context.leave(reply, 'sidC')

            context.empty.should.be.true()
        })

        it('replies with success to leaving socket', async () => {
            let called = false

            reply = (msg) => {
                called = true
                msg.should.be.eql({
                    success: true,
                    type: 'left context',
                    name: config.name,
                    params,
                    id,
                    message: 'left context',
                })
            }

            await context.leave(reply, 'sidA')

            called.should.be.true()
        })

        it('does not update data and status after leaving', async () => {
            let Acalled = false, Bcalled = false, Ccalled = false

            config.data = () => 'data'
            config.status = () => 'status'

            emitter.on('data', (dest, data) => {
                if (dest === 'sidA') Acalled = true
                if (dest === 'sidB') Bcalled = true
                if (dest === 'sidC') Ccalled = true
            })

            await context.leave(reply, 'sidA')

            await context.update_data()
            await context.update_status()

            Acalled.should.be.false()
            Bcalled.should.be.true()
            Ccalled.should.be.true()
        })

        it('calls the on_leave method of the config object before replying', async () => {
            let replied = false, called = false

            config.on_leave = (client_id) => {
                called = true
                client_id.should.be.exactly('authB')
                replied.should.be.false()
            }

            reply = () => {
                replied = true
                called.should.be.true()
            }

            await context.leave(reply, 'sidC')

            replied.should.be.true()
            called.should.be.true()
        })

        it('updates the status before replying', async () => {
            let replied = false, updated = false

            config.status = clients => clients

            reply = () => {
                replied = true
                updated.should.be.true()
            }

            emitter.on('status', (dest, status) => {
                updated = true
                replied.should.be.false()
                status.should.eql(['authA'])
            })

            await context.leave(reply, 'sidC')

            replied.should.be.true()
            updated.should.be.true()
        })

        it('says socket is no longer part of the context', async () => {
            await context.leave(reply, 'sidA')

            context.socket_is_member('sidA').should.be.false()
        })

        it('says the client is still member if connected with another socket', async () => {
            await context.leave(reply, 'sidA')

            context.client_is_member('authA').should.be.true()
        })

        it('says the client is no longer member if not connected with another socket', async () => {
            await context.leave(reply, 'sidC')

            context.client_is_member('authB').should.be.false()
        })
    })

    describe('missing sockets', () => {
        // HIER VERDER!!!!
        it('should handle missing sockets')
    })

    describe('closing contexts', () => {
        it('notifies all sockets the context is closed', async () => {
            await context.join(reply, 'sidA', 'authA')
            await context.join(reply, 'sidB', 'authA')
            await context.join(reply, 'sidC', 'authB')
            
            let Aclosed = false, Bclosed = false, Cclosed = false
            
            emitter.on('close', (dest) => {
                if (dest === 'sidA') Aclosed = true
                if (dest === 'sidB') Bclosed = true
                if (dest === 'sidC') Cclosed = true
            })

            await context.close()

            Aclosed.should.be.true()
            Bclosed.should.be.true()
            Cclosed.should.be.true()
        })

        it('calls the on_close method on the config object', async () => {
            let called = false

            config.on_close = () => called = true

            await context.close()

            called.should.be.true()
        })
    })
})