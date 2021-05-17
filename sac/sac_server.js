// a TODO list for improvement
//  - remove duplication in checking initial data and status updates on join
//  - abstract away request response mechanism over a socket (client key)
//  - remove early returns
//  - replace socket and client admin with just maps

const hash = require('object-hash')

// this sends a message across transport when initialized
let emit = () => {throw new Error('sac transport not initialized')}

function context_id(name, params) {
    return hash({ name, params })
}

class Context {
    async constructor(config, params) {
        this.config = config
        this.params = params

        this.id = context_id(this.config.name, this.params)

        this.clients = new Set()
        this.sockets = new Set()
        this.clients2sockets = new Map()
        this.sockets2clients = new Map()
    }

    get name() {
        return this.config.name
    }

    to_all(event, payload) {
        this.sockets.forEach(socket => emit(socket, event, payload))
    }

    is_member(socket_id) {
        return this.sockets.has(socket_id)
    }

    async join(socket_id, auth, client_key) {
        let client_id

        // check authorization
        try {
            client_id = await this.config.is_authorized(auth)
        } catch (err) {
            emit(socket_id, 'error', {
                type: 'auth',
                key: client_key,
                message: err.message,
            })
            return
        }

        // check whether client can join
        const join_status = await this.config.can_join(client_id, this.clients)
        if (join_status !== undefined) {
            emit(socket_id, 'error', {
                type: 'join',
                key: client_key,
                error: join_status,
            })
            return 
        }

        // update client and socket administration
        this.clients.add(client_id)
        this.sockets.add(socket_id)
        this.sockets2clients.set(socket_id, client_id)
        
        if (!this.clients2sockets.has(client_id)) {
            this.clients2sockets.set(client_id, new Set())
        }
        this.clients2sockets.get(client_id).add(socket_id)

        // tell client they are joined
        emit(socket_id, 'joined', {
            key: client_key,
            id: this.id,
        })

        // TODO remove duplication with update_data and update_status

        // give client current data
        const data_check = hash(this.data)
        this.data = await this.config.data()

        if (data_check !== hash(this.data)) {
            this.to_all('data', this.data)
        } else {
            emit(socket_id, 'data', this.data)
        }

        // check if status changed and in any case give client the current status
        const status_check = hash(this.status)
        this.status = await this.config.status(this.clients)
        
        if (status_check !== hash(this.status)) {
            this.to_all('status', this.status)
        } else {
            emit(socket_id, 'status', this.status)
        }
    }

    async handle_request(request, params) {
        if (this.config.requests[request]) {
            return await this.config.requests[request](params)
        }
    }

    async update_data() {
        const check = hash(this.data)
        this.data = await this.config.data()
        if (check !== hash(this.data)) {
            this.to_all('data', this.data)
        }
    }

    async update_status() {
        const check = hash(this.status)
        this.status = await this.config.status(this.clients)
        if (check !== hash(this.status)) {
            this.to_all('status', this.status)
        }
    }

    async leave(socket_id) {
        const client_id = this.sockets2clients.get(socket_id)

        this.sockets.delete(socket_id)

        this.clients2sockets.get(client_id).delete(socket_id)

        if (this.clients2sockets.get(client_id).size === 0) {
            this.clients2sockets.delete(client_id)
            this.clients.delete(client_id)

            await this.config.on_leave(client_id)
        }
    }

    async missing(socket_id) {
        const client_id = this.sockets2clients.get(socket_id)

        this.sockets.delete(socket_id)

        this.clients2sockets.get(client_id).delete(socket_id)

        if (this.clients2sockets.get(client_id).size === 0) {

            // TODO: let backend decide later to remove the client if 
            // it can stay at first
            if (!await this.config.on_missing(client_id)) {
                this.clients2sockets.delete(client_id)
                this.clients.delete(client_id)

                await this.config.on_leave(client_id)
            }
        }
    }

    async close() {
        this.to_all('close')
    }
}

// map of active contexts
const active = new Map()

// map of configs for contexts
const configs = new Map()

// throws an exception if there is a problem, otherwise returns true
function valid_config(config) {
    if (typeof(config.name) !== "string" || !config.name) {
        throw new Error(`config requires a non-empty string 'name'`)
    }

    return true
}

// socket.io is only used as transport and is confined
// to this function
function init(io) {
    emit = (dest, event, payload) => io.to(dest).emit(event, payload)
    
    io.of('/sac').on('connection', function(socket) {
        socket.on('join', async function(payload) {
            const id = context_id(payload.context, payload.params)
    
            if (!active.has(id)) {
                // check if config exists for this context name
                if (!configs.has(payload.context)) {
                    socket.emit('error', {
                        type: 'context',
                        key: payload.key,
                        message: `context '${payload.context}' unknown`
                    })
                        
                    return
                }

                const config = configs.get(payload.context)

                // check if context wants to accept these parameters
                try {
                    await config.is_valid(params)
                } catch (err) {
                    socket.emit('error', {
                        type: 'params',
                        key: payload.key,
                        message: err.message,
                    })
                    return
                }

                // construct context
                const context = new Context(config, payload.params)

                await this.config.init(
                    () => this.update_data(),
                    () => this.update_status(),
                    () => this.close()
                )

                await context.update_data()
                await context.update_status()

                active.set(id, context)
            }
    
            // let socket join
            active.get(id).join(socket.id, payload.auth, payload.key)
        })

        socket.on('request', async function(payload) {
            // const id = context_id(payload.context, payload.params)

            let response

            if (active.has(payload.id)) {
                if (!active.get(payload.id).is_member(socket.id)) {
                    socket.emit('error', {
                        type: 'not_member',
                        key: payload.key,
                        message: 'socket is not a member of this context',
                    })
                    return
                }

                try {
                    response = await active.get(payload.id).handle_request(payload.request)

                    socket.emit('response', {
                        key: payload.key,
                        payload: response,
                    })
                } catch (err) {
                    socket.emit('error', {
                        type: 'response',
                        key: payload.key,
                        message: err.message,
                    })
                }
            } else {
                socket.emit('error', {
                    type: 'request',
                    key: payload.key,
                    message: 'context does not exist',
                })
            }
        })

        socket.on('leave', function(payload) {
            if (active.has(payload.id)) {
                await active.get(payload.id).leave(socket.id)

                socket.emit('left', {
                    key: payload.key,
                })
            } else {
                socket.emit('error', {
                    type: 'not-member',
                    key: payload.key,
                    message: 'socket is not a member of this context',
                })
            }
        })
            
        socket.on('disconnect', async function() {
            // TODO change to O(1) instead of O(n)!
            await Promise.all(this.active.map((_, context) => context.missing(socket.id)))
        })
    })

}

// create new contexts based on a config object
function create(config) {
    if (valid_config(config)) {
        configs.set(config.name, config)
    }
}

function remove(name) {
    configs.delete(name)

    // TODO also close active contexts with that name?

    for (let entry of this.active) {
        if (entry[1].name === name) {
            await entry[1].close()
            this.active.delete(entry[0])
        }
    }
}

module.exports = {
    init,
    create,
    remove,
}