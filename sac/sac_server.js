


const transport = require('./transport')

async function handle_request(payload) {

}


// this sends a message across transport when initialized
let emit = () => {throw new Error('sac transport not initialized')}

// socket.io is only used as transport and is confined to this function
function init(io) {
    emit = (dest, event, payload) => io.to(dest).emit(event, payload)
    
    io.of('/sac').on('connection', function(socket) {
        socket.on('join', async function(payload) {
            
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
}