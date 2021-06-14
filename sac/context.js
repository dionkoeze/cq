const hash = require('object-hash')
const MapSet = require('./map_set')
const SocketCache = require('./socket_cache')

function context_id(name, params) {
    return hash({ name, params })
}

class Context {
    constructor(config, emitter, params) {
        
        if (config == null) {
            throw Error('context requires a config object')
        }
        if (typeof config.authorize !== 'function') {
            throw Error('requires authorize method in config')
        }
        if (config.name == null) {
            throw Error('context requires a name in the config object')
        }
        if (emitter == null || typeof emitter.emit !== 'function') {
            throw Error('context requires an emitter')
        }
        
        this.config = config
        this.params = params
        this.emitter = emitter
        
        this.id = context_id(this.config.name, this.params)
        
        try {
            this.config.is_valid?.(this.params)
        } catch (err) {
            // THE EMITTER HAS NO SOCKET DESTINATION?!
            emitter.emit('error', this.build_error('invalid params', err))
            throw Error('invalid params')
        }
        
        this.clients2sockets = new MapSet()
        this.sockets2clients = new MapSet()
        this.sockets = new Map()

        this.config.init?.(this.update_data.bind(this), this.update_status.bind(this), this.close.bind(this))
    }
    
    build_error(type, err) {
        return {
            type,
            name: this.name,
            params: this.params,
            message: err.message,
        }
    }

    get name() {
        return this.config.name
    }

    socket_is_member(socket_id) {
        return this.sockets2clients.hasKey(socket_id)
    }

    client_is_member(client_id) {
        return this.clients2sockets.hasKey(client_id)
    }

    async join(socket_id, auth) {
        let client_id

        try {
            client_id = await this.config.authorize(auth)
        } catch (err) {
            this.emitter.emit('error', this.build_error('unauthorized', err))
            return
        }

        try {
            await this.config.can_join?.(client_id, this.clients2sockets.keys)
        } catch (err) {
            this.emitter.emit('error', this.build_error('not allowed', err))
            return
        }

        this.clients2sockets.add(client_id, socket_id)
        this.sockets2clients.add(socket_id, client_id)
        this.sockets.add(socket_id, new SocketCache(socket_id, this.emitter))

        await this.update_status()

        await this.config.joined?.(socket_id, client_id)
    }

    async handle_request() {}

    async update_data() {}

    async update_status() {}

    async leave() {}

    async missing() {}

    async close() {}
}

module.exports = {
    Context,
    context_id,
}