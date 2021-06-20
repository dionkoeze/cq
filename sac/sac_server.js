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

    // TODO: close active contexts with this name!
}

function exists(name) {
    return configs.has(name)
}

function active_name(name, params) {
    // TODO
    // return contexts.has(context_id(name, params))
}

function active_id(id) {
    // TODO
    // return contexts.has(id)
}

function ensure_active(respond, name, params) {
    if (!active_name(name, params)) {

    }
}

// socket.io is only used as transport and is confined to this function
function init(io) {
    reset()

    emit = (event, dest, payload) => io.to(dest).emit(event, payload)
   
    // TODO: use namespace?
    // .of('/sac')
    io.on('connection', function(socket) {
        socket.on('join', async function(auth, context, reply) {
            // console.log('payload', payload)

            // USE SOCKET.IO ACKNOWLEDGEMENTS FOR REPLYING!!!

            // ensure_active(context.name, context.params)

            const id = context_id(context.name, context.params)

            if (!active_id(id)) {
                console.log(id, 'not found')

                if (configs.has(context.name)) {
                    console.log('creating', context.name)

                    let ctx

                    try {
                        ctx = new Context(reply, configs.get(context.name), emit, context.params)
                        console.log('created', context.name)
                    } catch (err) {
                        console.log(err)
                        return
                    }

                    contexts.set(id, ctx)
                } else {
                    reply({
                        success: false,
                        type: 'unknown context',
                        name: context.name,
                        params: context.params,
                        message: 'no context with that name registered',
                    })
                }
            }

            const ctx = contexts.get(id)

            await ctx.join(reply, socket.id, auth)

            // reply('you joined')
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