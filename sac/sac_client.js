// io is the socket.io object

const sac = (function() {
    contexts = new Map()

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

                // HOW DO WE KNOW THE DATA BELONGS TO THIS CONTEXT?!?!
                io.on('data', (data) => callbacks.data?.(data))

                io.on('status', (status) => callbacks.status?.(status))

                io.on('close', (info) => {
                    suicide()
                    callbacks.close?.(info)
                })
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

        return new Context(id, name, params)
    }

    function join(context, auth, callbacks) {
        return new Promise((resolve, reject) => {
            io.emit('join', auth, context, (res) => {
                if (res.success) resolve(create(res.id, res.name, res.params, callbacks))
                else reject(res)
            })
        })
    }

    function get(id) {
        return contexts.get(id)
    }

    return {
        join,
        get,
    }
})()
