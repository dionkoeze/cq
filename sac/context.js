const hash = require('object-hash')
const MapSet = require('./map_set')
const SocketCache = require('./socket_cache')

function context_id(name, params) {
    return hash({ name, params })
}

class Context {
    constructor(reply, config, emit, params) {
        if (config == null) {
            throw Error('context requires a config object')
        }
        if (typeof config.authorize !== 'function') {
            throw Error('requires authorize method in config')
        }
        if (config.name == null) {
            throw Error('context requires a name in the config object')
        }
        if (typeof emit !== 'function') {
            throw Error('context requires an emitter')
        }
        
        this.config = config
        this.params = params
        this.emit = emit
        
        this.id = context_id(this.config.name, this.params)
        
        try {
            this.config.is_valid?.(this.params)
        } catch (err) {
            reply(this.build_error('invalid params', err))
            throw Error('invalid params')
        }
        
        this.clients2sockets = new MapSet()
        this.sockets2clients = new MapSet()
        this.sockets = new Map()

        this.config.init?.(this.update_data.bind(this), this.update_status.bind(this), this.close.bind(this))

        // reply(this.build_success('context created', 'context created'))
    }
    
    build_error(type, err) {
        return {
            success: false,
            type,
            name: this.name,
            params: this.params,
            id: this.id,
            message: err.message,
        }
    }

    build_success(type, message) {
        return {
            success: true,
            type,
            name: this.name,
            params: this.params,
            id: this.id,
            message,
        }
    }

    get name() {
        return this.config.name
    }

    get empty() {
        return this.sockets.size === 0
    }

    socket_is_member(socket_id) {
        return this.sockets2clients.hasKey(socket_id)
    }

    client_is_member(client_id) {
        return this.clients2sockets.hasKey(client_id)
    }

    async join(reply, socket_id, auth) {
        let client_id

        try {
            client_id = await this.config.authorize(auth)
        } catch (err) {
            reply(this.build_error('unauthorized', err))
            return
        }

        try {
            await this.config.can_join?.(client_id, this.clients2sockets.keys)
        } catch (err) {
            reply(this.build_error('not allowed', err))
            return
        }

        this.clients2sockets.add(client_id, socket_id)
        this.sockets2clients.add(socket_id, client_id)
        this.sockets.set(socket_id, new SocketCache(socket_id, this.emit))

        await this.update_status()

        await this.config.joined?.(socket_id, client_id)

        reply(this.build_success('joined', `joined context ${this.name}`))
    }

    async handle_request(reply, request, socket_id) {
        // SHOULD EMIT AN EVENT SIGNALLING ALL OTHER CONTEXTS THEY
        // MIGHT NEED TO UPDATE THEIR DATA BEFORE THIS REQUEST IS
        // REPLIED TO SOCKET (GUARANTEE THAT DATA IS UPDATED BEFORE REPLY)

        if (typeof request.query !== 'string') {
            reply(this.build_error('illegal request', Error('request query should be a string')))
            return
        }

        if (typeof this.config.requests?.[request.query] === 'undefined') {
            reply(this.build_error('illegal request', Error('no known handler for this request')))
            return
        }

        if (!this.sockets2clients.hasKey(socket_id)) {
            reply(this.build_error('no member', Error('you are not a member of this context')))
        }

        try {
            const response = await this.config.requests[request.query](request.params)
            
            await this.update_data()
            
            await this.update_status()

            reply(this.build_success('response', response))
        } catch (err) {
            reply(this.build_error('handler error', err))
        }

    }

    async update_data() {
        const data = await this.config.data?.()

        if (data != null) {
            this.sockets.forEach(socket => socket.update_data(data))
        }
    }

    async update_status() {
        const status = await this.config.status?.(this.clients2sockets.keys)

        if (status != null) {
            this.sockets.forEach(socket => socket.update_status(status))
        }
    }

    async leave(reply, socket_id) {
        if (this.sockets2clients.hasKey(socket_id)) {
            // this assumes a socket has at most one client connected
            const clients = this.sockets2clients.get(socket_id)
            const client_id = clients.values().next().value
            
            await this.config.on_leave?.(client_id)
            
            this.sockets2clients.delete(socket_id)
            this.clients2sockets.deleteValue(client_id, socket_id)
            this.sockets.delete(socket_id)
    
            await this.update_status()
        }

        reply(this.build_success('left context', 'left context'))
    }

    async missing() {
        // TODO
        throw Error('not implemented')
    } // HIER VERDER!!!!!!!

    async close() {
        await this.config.on_close?.()

        this.sockets.forEach(socket => this.emit(socket.id, 'close'))
    }
}

module.exports = {
    Context,
    context_id,
}