const sac = require('../sac/sac_client')
const m = require('mithril')

const socket = io('http://localhost:8080/sac')

m.request({
    method: 'POST',
    url: 'http://localhost:8080/auth',
})
.then(token => {
    console.log(token)

    socket.emit('join', {
        key: '123',
        context: 'echo',
        params: null,
        auth: token,
    })
})

socket.on('error', console.error)

// socket.on('joined', console.log)
// socket.use()




// const DataComponent = require('./data_component')

// m.mount(document.getElementById('app'), DataComponent)

