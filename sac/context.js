const hash = require('object-hash')
const MapSet = require('./map_set')

function context_id(name, params) {
    return hash({ name, params })
}

class Context {
    constructor(config, params, emitter) {
        this.config = config
        this.params = params
        this.emitter = emitter

        this.id = context_id(this.config.name, this.params)

        this.clients2sockets = new MapSet()
        this.sockets2clients = new MapSet()
    }

    get name() {
        return this.config.name
    }

    socket_is_member(socket_id) {}

    client_is_member(client_id) {}

    async join(socket_id, client_id) {}

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