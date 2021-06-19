const {Context, context_id} = require('./context')

let configs
let contexts

let emit

function reset() {
    // this sends a message across transport when initialized
    emit = () => {throw new Error('sac transport not initialized')}

    configs = new Map()
    contexts = new Map()
}

function add(config) {
    if (config == null) {
        throw Error('context requires a config object')
    }
    if (typeof config.authorize !== 'function') {
        throw Error('requires authorize method in config')
    }
    if (config.name == null) {
        throw Error('requires name in config')
    }

    configs.set(config.name, config)
}

async function remove(name) {
    configs.delete(name)

    
}

function exists(name) {
    return configs.has(name)
}

function active_name(name, params) {
    // return contexts.has(context_id(name, params))
}

function active_id(id) {
    // return contexts.has(id)
}

// socket.io is only used as transport and is confined to this function
function init(io) {
    reset()

    emit = (event, dest, payload) => io.to(dest).emit(event, payload)
    
    // .of('/sac')
    io.on('connection', function(socket) {
        console.log('sac connected')

        socket.on('join', async function(payload) {
            console.log('payload', payload)

            // USE SOCKET.IO ACKNOWLEDGEMENTS FOR REPLYING!!!
        })

        socket.on('request', async function(payload) {
            
        })

        socket.on('leave', async function(payload) {
            
        })
            
        socket.on('disconnect', async function() {
            
        })
    })

}

module.exports = {
    init,
    reset,
    add,
    remove,
    exists,
    active_name,
    active_id,
}