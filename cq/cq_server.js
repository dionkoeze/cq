const TreeEventEmitter = require('../tree_events/tree_events')

const {get_key} = require('./cq_utils')

const handlers = new Map()
const tree = new TreeEventEmitter()
let _io = null

class Handler {
    constructor(trigger, callback) {
        console.log(callback)
        this.callback = callback

        if (trigger instanceof Function) {
            this.trigger = trigger
        } else {
            this.trigger = () => {}
        }
    }
}

class ActiveQuery {
    constructor(query) {
        this.query = query
        this.size = 0

        const handler = handlers.get(query.name)
        this.callback = async () => await this.trigger()
        tree.on(handler.trigger(query.params), this.callback)
    }

    detach() {
        tree.detach(this.callback)
    }

    add(socket) {
        socket.join(this.query.key)
        this.size += 1
    }

    remove(socket) {
        socket.leave(this.query.key)
        this.size -= 1
    }

    async trigger(socket) {
        // if socket is given an update is given to only that socket,
        // otherwise to the entire room
        const destination = !!socket ? socket.id : this.query.key

        const update = (response) => {
            _io.to(destination).emit('update', {
                query: this.query,
                response,
            })
        }

        const touched = (path) => {
            tree.emit(path)
        }

        const handler = handlers.get(this.query.name)
        await handler.callback(this.query.params, update, touched, socket?.handshake.auth)
    }
}

const Active = {
    active: new Map(),

    async handle(socket, query) {
        if (!this.active.has(query.key)) {
            this.active.set(query.key, new ActiveQuery(query))
        }

        const current = this.active.get(query.key)
        current.add(socket)
        await current.trigger(socket)
    },

    close(socket, key) {
        const active_query = this.active.get(key)

        active_query.remove(socket)

        if (active_query.size === 0) {
            // this.active.delete(key)
            this.delete(key)
        }
    },
    
    delete(key) {
        console.log(key)
        this.active.get(key).detach()
        this.active.delete(key)
    },
}

// registers a new query endpoint
function on(query_name, handler, trigger) {
    handlers.set(query_name, new Handler(trigger, handler))
}

function trigger(query_name) {
    Active.active.forEach(aq => {
        if (aq.query.name === query_name) {
            aq.trigger()
        }
    })
}

// needs to be run once to couple library to socket io events
function init(io) {
    _io = io

    // listen for deleted rooms
    io.of('/').adapter.on('delete-room', key => {
        Active.delete(key)
    })

    // handle incoming messages from clients
    io.on('connection', socket => {
        socket.on('query', async query => {
            query.key = this.get_key(query)
            await Active.handle(socket, query)
        })

        socket.on('close', key => {
            Active.close(socket, key)
        })
    })
}

module.exports = {
    get_key,
    on,
    trigger,
    init,
}
