const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");

const sac = require('../sac/sac_server')

describe('shared active context server', () => {
    describe('adding config objects', () => {
        it('adds a valid config', () => {
            sac.add({
                name: 'test',
                authorize: () => {},
            })

            sac.exists('test').should.be.true()
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
    })

    describe('removing config objects', () => {
        it('removes a config object')

        it('fails silently when removing a non existent config object')

        it('closes active contexts when their config object is removed')
    })

    describe('socket io integration', () => {
        let io, serverSocket, clientSocket

        beforeEach((done) => {
            const httpServer = createServer();
            io = new Server(httpServer);
            
            httpServer.listen(() => {
                const port = httpServer.address().port;
                clientSocket = new Client(`http://localhost:${port}`);
              
                io.on("connection", (socket) => {
                    console.log('server connected')
                    serverSocket = socket;
                });
            
                clientSocket.on("connect", () => {
                    console.log('client connected')
                    done()
                });
            });
        
            sac.init(io)
        })

        afterEach(() => {
            io.close();
            clientSocket.close();
        });

        it.only('listens to a join message', (done) => {
            serverSocket.on('join', (arg) => {
                console.log('yo', arg)
                done() // CALLING DONE IS NECESSARY IN SOCKET IO TESTS!!!!
            })
            clientSocket.emit('join', 'yoooooooo')
        })

        // it.only("should work", (done) => {
        //     clientSocket.on("hello", (arg) => {
        //         // assert.equal(arg, "world");
        //         arg.should.be.exactly("world")
        //         done();
        //     });
        //     serverSocket.emit("hello", "world");
        // });
        
        // it.only("should work (with ack)", (done) => {
        //     serverSocket.on("hi", (cb) => {
        //         console.log('hola')
        //         cb("hola");
        //     });
        //     clientSocket.emit("hi", (arg) => {
        //         // assert.equal(arg, "hola");
        //         arg.should.be.exactly("hola")
        //         done();
        //     });
        // });

        it('listens to a request message')

        it('listens to a leave message')

        it('handles the disconnect event')
    })
})