const express = require('express')
app = express()
const httpServer = require('http').createServer(app)
const io = require('socket.io')(httpServer)

const uuid = require('uuid').v4

const cq = require('../cq/cq_server')

let start_data = ['apple', 'banana', 'berry', 'water']

let data = new Map()

start_data
.map(str => ({
    id: uuid(),
    string: str,
    editors: [],
}))
.forEach(entry => {
    data.set(entry.id, entry)
})

cq.on('get-list', (_, update) => {
    update(Array.from(data.values()).map(({id, string}) => ({id, string})))
})

cq.on('editors', (_, update) => {
    update(Array.from(data.values()).map(({editors}) => editors))
})

cq.on('edit-status', (params, update, auth) => {
    const entry = data.get(params.id)

    if (params.editing) {
        entry.editors.push(auth.name)
    } else {
        entry.editors = entry.editors.filter(name => name !== auth.name)
    }

    update({
        success: true,
    })

    cq.trigger('editors')
})

cq.on('change-string', (params, update) => {
    data.get(params.id).string = params.string

    update({
        ...params,
        success: true,
    })

    cq.trigger('get-list')
})

cq.on('new-string', (params, update) => {
    if (!!params.string) {
        const entry = {
            id: uuid(),
            string: params.string,
            editors: [],
        }

        data.set(entry.id, entry)

        update({
            success: true,
            added: params.string,
        })
    } else {
        update({
            success: false,
        })
    }

    cq.trigger('get-list')
})

cq.init(io)

app.use('/', express.static(__dirname + '/../'))

httpServer.listen(process.env.PORT || 8080)
