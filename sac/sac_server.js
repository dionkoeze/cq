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

    contexts.forEach(async (ctx, id) => {
        if (ctx.name === name) {
            await ctx.close()
            contexts.delete(id)
        }
    })
}

function exists(name) {
    return configs.has(name)
}

function active_name(name, params) {
    return contexts.has(context_id(name, params))
}

function active_id(id) {
    return contexts.has(id)
}

// socket.io is only used as transport and is confined to this function
function init(io) {
    reset()

    emit = (dest, event, payload) => io.to(dest).emit(event, payload)
   
    // TODO: use namespace?
    // .of('/sac')
    io.on('connection', function(socket) {
        socket.on('join', async function(auth, context, reply) {
            const id = context_id(context.name, context.params)

            if (!active_id(id)) {
                if (configs.has(context.name)) {
                    let ctx

                    try {
                        ctx = new Context(reply, configs.get(context.name), emit, context.params)
                    } catch (_) {
                        return
                    }

                    contexts.set(id, ctx)
                } else {
                    reply({
                        success: false,
                        type: 'unknown',
                        name: context.name,
                        params: context.params,
                        message: 'no context with that name registered',
                    })
                }
            }

            const ctx = contexts.get(id)

            await ctx.join(reply, socket.id, auth)
        })

        socket.on('request', async function(id, request, reply) {
            if (contexts.has(id)) {
                const ctx = contexts.get(id)

                await ctx.handle_request(reply, request, socket.id)
            } else {
                reply({
                    success: false,
                    type: 'unknown',
                    id,
                    request,
                    message: 'no context with that id registered'
                })
            }
        })

        socket.on('leave', async function(id, reply) {
            if (contexts.has(id)) {
                const ctx = contexts.get(id)

                await ctx.leave(reply, socket.id)

                if (ctx.empty) {
                    contexts.delete(id)
                }
            } else {
                reply({
                    success: false,
                    type: 'unknown',
                    id,
                    request,
                    message: 'no context with that id registered'
                })
            }
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