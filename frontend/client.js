const m = require('mithril')
const socket = io('http://localhost:8080')
const sac = require('../sac/sac_client')


const AuthComponent = {
    view(vnode) {
        return [
            m('p', 'Wat is je naam?'),
            m('input', {
                placeholder: 'je naam',
                oninput(e) {
                    e.preventDefault()
                    console.log(e.target.value)
                    vnode.attrs.name = e.target.value
                }
            }),
            m('button', {
                disabled: true,
                value: 'Start',
                onclick() {
                    console.log('clicked')
                },
            }),
        ]
    }
}

m.mount(document.getElementById('app'), AuthComponent)

// m.request({
//     method: 'POST',
//     url: 'http://localhost:8080/auth',
// })
// .then(token => {
//     console.log(token)

//     socket.emit('join', {
//         key: '123',
//         context: 'echo',
//         params: null,
//         auth: token,
//     })
// })

// socket.on('error', console.error)

// socket.on('joined', console.log)
// socket.use()




// const DataComponent = require('./data_component')

// m.mount(document.getElementById('app'), DataComponent)

