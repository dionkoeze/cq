// io is the socket.io object

function init(socket) {
    socket.on('data', (payload) => {
        if (contexts.has(payload.id)) {
            contexts.get(payload.id).data(payload.data)
        }
    })

    socket.on('status', (payload) => {
        if (contexts.has(payload.id)) {
            contexts.get(payload.id).status(payload.status)
        }
    })

    socket.on('close', (info) => {
        if (contexts.has(info.id)) {
            contexts.get(info.id).close(info)
        }
    })
}

const contexts = new Map()

// this creates a closure over suicide and callbacks
// to avoid polluting the exposed interface
function create(id, name, params, callbacks) {
    let alive = true

    function suicide() {
        alive = false
        contexts.delete(id)
    }

    class Context {
        constructor(id, name, params) {
            this.id = id
            this.name = name
            this.params = params
        }

        get active() {
            return alive
        }

        set on_data(callback) {
            callbacks.data = callback
        }

        set on_status(callback) {
            callbacks.status = callback
        }

        set on_close(callback) {
            callbacks.close = callback
        }

        request(request) {
            if (alive) {
                return new Promise((resolve, reject) => {
                    io.emit('request', this.id, request, (res) => {
                        if (res.success) resolve(res)
                        else reject(res)
                    })
                })
            } else {
                return new Promise((_, reject) => reject(Error('context expired')))
            }
        }

        leave() {
            if (alive) {
                return new Promise((resolve, reject) => {
                    io.emit('leave', this.id, (res) => {
                        if (res.success) {
                            suicide()
                            resolve()
                        }
                        else reject(res)
                    })
                })
            } else {
                return new Promise((_, reject) => reject(Error('context expired')))
            }
        }
    }

    // only the context object is exposed
    return {
        context: new Context(id, name, params),
        data: data => callbacks.data?.(data),
        status: status => callbacks.status?.(status),
        close: info => {
            suicide()
            callbacks.close?.(info)
        },
    }
}

function join(context, auth, callbacks) {
    return new Promise((resolve, reject) => {
        io.emit('join', auth, context, (res) => {
            if (res.success) {
                const ctx = create(res.id, res.name, res.params, callbacks)
                contexts.set(res.id, ctx)
                resolve(ctx.context)
            }
            else reject(res)
        })
    })
}

function get(id) {
    return contexts.get(id).context
}

module.exports = {
    init,
    join,
    get,
}
