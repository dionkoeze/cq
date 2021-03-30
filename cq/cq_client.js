const uuid = require('uuid').v4
const {get_key} = require('./cq_utils')

const beforeHooks = new Map()
const afterHooks = new Map()

function unhook(id) {
    beforeHooks.delete(id)
    afterHooks.delete(id)
}

function before(callback) {
    const id = uuid()
    beforeHooks.set(id, callback)
    return id
}

function after(callback) {
    const id = uuid()
    afterHooks.set(id, callback)
    return id
}

async function run_hooks(collection) {
    await Promise.all(Array.from(collection.values()).map(hook => new Promise((res, _) => res()).then(hook)))
}

async function run_before_hooks() {
    await run_hooks(beforeHooks)
}   

async function run_after_hooks() {
    await run_hooks(afterHooks)
}

function start(query_name, params, update) {
    const query = {
        name: query_name,
        params: params,
    }

    const key = this.get_key(query)

    this.socket.emit('query', query)

    if (typeof update !== 'function') {
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
        await run_before_hooks()
        await update(data.response)
        await run_after_hooks()
    })
}

module.exports = {
    running: new Map(),
    get_key,
    start,
    once,
    stop,
    init,
    unhook,
    before,
    after,
}