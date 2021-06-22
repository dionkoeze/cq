const express = require('express')
app = express()
const httpServer = require('http').createServer(app)
const io = require('socket.io')(httpServer)
const jwt = require('jsonwebtoken')
const uuid = require('uuid').v4

const sac = require('../sac/sac_server')

let start_data = ['apple', 'banana', 'milk', 'water']

let data = new Map()

start_data
.map(str => ({
    id: uuid(),
    string: str,
    editor: undefined,
}))
.forEach(entry => {
    data.set(entry.id, entry)
})

sac.init(io)

sac.add({
    name: 'items',
    authorize(token) {
        return jwt.verify(token, 'secret')
    },
    data() {
        return Array.from(data.values()).map(entry => ({id: entry.id, string: entry.str}))
    },
    status() {
        return Array.from(data.values()).map(entry => ({id: entry.id, editor: entry.editor}))
    },
    requests: {
        add() {

        },
    }
})

// sac.add({
//     name: 'edit',
//     authorize(token) {
//         return jwt.verify(token, 'secret')
//     },
//     can_join() {

//     },
//     requests: {
//         set() {

//         },
//     }
// })

app.post('/auth', function(req, res) {
    res.status(201).json(jwt.sign(req.body.name, 'secret'))
})

app.use('/', express.static(__dirname + '/../'))

httpServer.listen(process.env.PORT || 8080)
