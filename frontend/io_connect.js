const cq = require('../cq/cq_client')

function connect(name) {
    if (name == undefined) {
        window.socket = io({
            auth: {
                anonymous: true,
            },
        })
    } else {
        window.socket = io({
            auth: {
                anonymous: false,
                name,
            },
        })
    }

    cq.init(window.socket)
}

module.exports = connect
