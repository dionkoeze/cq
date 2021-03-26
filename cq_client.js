const {get_key} = require('./cq_utils')

function start(query_name, params, update) {
    const query = {
        name: query_name,
        params: params,
    }

    const key = this.get_key(query)

    this.socket.emit('query', query)

    if (update === undefined || update === null) {
        this.running.set(key, () => {})
    } else {
        this.running.set(key, update)
    }

    return key
}

function once(query_name, params, update) {
    const key = this.start(query_name, params, (response) => {
        if (update !== undefined && update !== null) {
            update(response)
        }
        this.stop(key)
    })
}

function stop(key) {
    this.running.delete(key)

    this.socket.emit('close', key)

    this.socket.removeAllListeners(key)
}

function init(socket) {
    this.socket = socket

    this.socket.on('update', async data => {
        const update = this.running.get(data.query.key)
        await update(data.response)
    })
}

module.exports = {
    running: new Map(),
    get_key,
    start,
    once,
    stop,
    init,
}