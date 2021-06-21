const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");

const sac = require('../sac/sac_server')

describe('shared active context server', () => {
    describe('adding config objects', () => {
        beforeEach(() => {
            // this mocks the socket io object
            sac.init({on: () => {}})
        })

        it('adds and removes a valid config', () => {
            sac.add({
                name: 'test',
                authorize: () => {},
            })

            sac.exists('test').should.be.true()

            sac.remove('test')

            sac.exists('test').should.be.false()
        })

        it('does not add an undefined config', () => {
            should(() => sac.add()).throw('context requires a config object')
        })

        it('does not add a config without authorize method', () => {
            should(() => sac.add({name: 'name'})).throw('requires authorize method in config')
        })

        it('does not add a config without a name', () => {
            should(() => sac.add({authorize: () => {}})).throw('requires name in config')
        })

        it('fails silently when removing a non existent config object', () => {
            sac.remove('test')
        })
    })
    
    describe('socket io integration and active context management', () => {
        let io, serverSocket, clientSocketA, clientSocketB
        
        beforeEach((done) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            
            httpServer.listen(() => {
                const port = httpServer.address().port;
                clientSocketA = new Client(`http://localhost:${port}`);
                clientSocketB = new Client(`http://localhost:${port}`);
                
                io.on("connection", (socket) => {
                    serverSocket = socket;
                });

                let Aconn = false, Bconn = false
                
                clientSocketA.on("connect", () => {
                    Aconn = true
                    if (Bconn) done()
                });

                clientSocketB.on("connect", () => {
                    Bconn = true
                    if (Aconn) done()
                });
            });
            
            sac.init(io)

            sac.add({
                name: 'testctx',
                authorize: auth => auth,
                requests: {
                    echo: x => x,
                    fail: () => {throw Error('failed on purpose')},
                }
            })
        })
        
        afterEach(() => {
            io.close();
            clientSocketA.close();
        });
        
        it('handles a joining socket', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx', 
                params: {param: true}
            }, (res) => {
                res.should.have.property('success', true)
                res.should.have.property('type', 'joined')
                res.should.have.property('name', 'testctx')
                res.should.have.property('params', {param: true})
                res.should.have.property('id')
                res.should.have.property('message', 'joined context testctx')
                done()
            })
            
        })

        it('creates different contexts if only parameters differ', (done) => {
            const pA = new Promise((resolve, reject) => {
                clientSocketA.emit('join', 'auth', {
                    name: 'testctx',
                }, (res) => {
                    if (res.success) resolve(res.id)
                    else reject(res)
                })
            })

            const pB = new Promise((resolve, reject) => {
                clientSocketB.emit('join', 'auth', {
                    name: 'testctx',
                    params: {}, // note the minor difference!
                }, (res) => {
                    if (res.success) resolve(res.id)
                    else reject(res)
                })
            })

            Promise.all([pA, pB])
            .then((idA, idB) => {
                idA.should.not.equal(idB)
                done()
            })
            .catch(done)
        })

        it('responds with an error if context is not registered', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'nonexistent',
            }, (res) => {
                res.should.have.property('success', false)
                res.should.have.property('type', 'unknown')
                res.should.have.property('name', 'nonexistent')
                res.should.have.property('message', 'no context with that name registered')
                done()
            })
        })

        it('responds with an error if user is not authorized', (done) => {
            sac.add({
                name: 'unauth',
                authorize: () => {throw Error('not authorized')}
            })

            clientSocketA.emit('join', 'unauthorized', {
                name: 'unauth',
            }, (res) => {
                res.should.have.property('success', false)
                res.should.have.property('type', 'unauthorized')
                res.should.have.property('name', 'unauth')
                res.should.have.property('id')
                res.should.have.property('message', 'not authorized')
                done()
            })
        })

        it('responds with an error if params are invalid', (done) => {
            sac.add({
                name: 'invalidparams',
                authorize: auth => auth,
                is_valid: () => {throw Error('invalid by design')}
            })

            clientSocketA.emit('join', 'auth', {
                name: 'invalidparams'
            }, (res) => {
                res.should.have.property('success', false)
                res.should.have.property('type', 'invalid params')
                res.should.have.property('name', 'invalidparams')
                res.should.have.property('id')
                res.should.have.property('message', 'invalid by design')
                done()
            })
        })

        it('responds with an error if socket is not allowed to join', (done) => {
            sac.add({
                name: 'unjoinable',
                authorize: auth => auth,
                can_join: () => {throw Error('always full')}
            })

            clientSocketA.emit('join', 'auth', {
                name: 'unjoinable',
            }, (res) => {
                res.should.have.property('success', false)
                res.should.have.property('type', 'not allowed')
                res.should.have.property('name', 'unjoinable')
                res.should.have.property('id')
                res.should.have.property('message', 'always full')
                done()
            })
        })
                            
        it('responds to a request message', (done) => {
            sac.add({
                name: 'doubler',
                authorize: auth => auth,
                requests: {
                    duplicate_echo: params => ({
                        str: `${params.msg} ${params.msg}`
                    })
                }
            })

            clientSocketA.emit('join', 'auth', {
                name: 'doubler'
            }, (res) => {
                res.success.should.be.true()
                clientSocketA.emit('request', res.id, {
                    query: 'duplicate_echo',
                    params: {
                        msg: 'hi'
                    }
                }, (res) => {
                    res.should.have.property('success', true)
                    res.should.have.property('type', 'response')
                    res.should.have.property('name', 'doubler')
                    res.should.have.property('id')
                    res.should.have.property('message', {str: 'hi hi'})
                    done()
                })
            })
        })

        it('responds with an error if the context does not exist', (done) => {
            clientSocketA.emit('request', '1234', {
                query: 'trial',
            }, (res) => {
                res.should.have.property('success', false)
                res.should.have.property('type', 'unknown')
                res.should.have.property('id', '1234')
                res.should.have.property('request', {query: 'trial'})
                res.should.have.property('message', 'no context with that id registered')
                done()
            })
        })

        it('responds with an error if the socket is not a member of the context', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
            }, (res) => {
                clientSocketB.emit('request', res.id, {
                    query: 'echo',
                    params: 'hi',
                }, (res) => {
                    res.should.have.property('success', false)
                    res.should.have.property('type', 'no member')
                    res.should.have.property('name', 'testctx')
                    res.should.have.property('id')
                    res.should.have.property('message', 'you are not a member of this context')
                    done()
                })
            })
        })

        it('responds with an error if request handler does not exist', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
            }, (res) => {
                clientSocketA.emit('request', res.id, {
                    query: 'fake',
                    params: 'hi',
                }, (res) => {
                    res.should.have.property('success', false)
                    res.should.have.property('type', 'illegal request')
                    res.should.have.property('name', 'testctx')
                    res.should.have.property('id')
                    res.should.have.property('message', 'no known handler for this request')
                    done()
                })
            })
        })

        it('responds with an error if request handler throws', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
            }, (res) => {
                clientSocketA.emit('request', res.id, {
                    query: 'fail',
                    params: 'hi',
                }, (res) => {
                    res.should.have.property('success', false)
                    res.should.have.property('type', 'handler error')
                    res.should.have.property('name', 'testctx')
                    res.should.have.property('id')
                    res.should.have.property('message', 'failed on purpose')
                    done()
                })
            })
        })
        
        it('lets a socket leave', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
            }, (res) => {
                res.success.should.be.true()
                clientSocketA.emit('leave', res.id, (res) => {
                    res.should.have.property('success', true)
                    res.should.have.property('type', 'left')
                    res.should.have.property('name', 'testctx')
                    res.should.have.property('id')
                    res.should.have.property('message', 'left context')
                    done()
                })
            })
        })

        it('fails silently if a socket leaves a context it is not a member of', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx'
            }, (res) => {
                res.success.should.be.true()
                clientSocketB.emit('leave', res.id, (res) => {
                    res.should.have.property('success', true)
                    res.should.have.property('type', 'left')
                    res.should.have.property('name', 'testctx')
                    res.should.have.property('id')
                    res.should.have.property('message', 'left context')
                    done()
                })
            })
        })
        
        it('handles the disconnect event')

        it('closes active contexts when their config object is removed', (done) => {
            clientSocketA.on('close', (ctx) => {
                ctx.should.have.property('name', 'testctx')
                ctx.should.have.property('params', {param: true})
                ctx.should.have.property('id')
                done()
            })

            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
                params: {param: true}
            }, async (res) => {
                res.success.should.be.true()
                await sac.remove('testctx')
                sac.exists('testctx').should.be.false()
            })
        })
        
        it('has an active context after joining', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
                params: 'hi',
            }, (res) => {
                res.success.should.be.true()
                sac.active_id(res.id).should.be.true()
                sac.active_name(res.name, res.params).should.be.true()
                done()
            })
        })
        
        it('removes empty contexts', (done) => {
            clientSocketA.emit('join', 'auth', {
                name: 'testctx',
                params: 'hi',
            }, (res) => {
                res.success.should.be.true()
                clientSocketA.emit('leave', res.id, (res) => {
                    res.success.should.be.true()
                    sac.active_id(res.id).should.be.false()
                    sac.active_name(res.name, res.params).should.be.false()
                    done()
                })
            })
        })
    })
})