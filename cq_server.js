const {get_key} = require('./cq_utils')

const handlers = new Map()
let _io = null

class ActiveQuery {
    constructor(query) {
        this.query = query
        this.size = 0
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

        const handler = handlers.get(this.query.name)
        await handler(this.query.params, update, socket?.handshake.auth)
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
            this.active.delete(key)
        }
    },

    delete(key) {
        this.active.delete(key)
    },
}

// registers a new query endpoint
function on(query_name, handler) {
    handlers.set(query_name, handler)
}

function trigger(query_name) {
    // TODO this is O(n) and needs improving!
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
