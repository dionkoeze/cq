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
        let io, serverSocket, clientSocket
        
        beforeEach((done) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            
            httpServer.listen(() => {
                const port = httpServer.address().port;
                clientSocket = new Client(`http://localhost:${port}`);
                
                io.on("connection", (socket) => {
                    // console.log('server connected')
                    serverSocket = socket;
                });
                
                clientSocket.on("connect", () => {
                    // console.log('client connected')
                    done()
                });
            });
            
            sac.init(io)

            sac.add({
                name: 'testctx',
                authorize: auth => auth,
            })
        })
        
        afterEach(() => {
            io.close();
            clientSocket.close();
        });
        
        it('handles a joining socket', (done) => {
            clientSocket.emit('join', 'auth', {
                name: 'testctx', 
                params: {param: true}
            }, (res) => {
                console.log('client:', res)
                done()
            })
            
        })

        it('responds with an error if context is not registered')
                            
        it('listens to a request message')
        
        it('listens to a leave message')
        
        it('handles the disconnect event')

        it('closes active contexts when their config object is removed')
        
        it('has an active context after joining')
        
        it('removes empty contexts')
    })
})