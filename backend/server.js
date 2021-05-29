const express = require('express')
app = express()
const httpServer = require('http').createServer(app)
const io = require('socket.io')(httpServer)
const jwt = require('jsonwebtoken')
const uuid = require('uuid').v4

const sac = require('../sac/sac_server')

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

sac.init(io)

sac.create({
    name: 'echo',
    is_valid() {},
    init(update_data, update_status, close) {},
    authorize(token) {
        return jwt.verify(token, 'secret')
    }
})

app.post('/auth', function(req, res) {
    res.status(201).json(jwt.sign(uuid(), 'secret'))
})

app.use('/', express.static(__dirname + '/../'))

httpServer.listen(process.env.PORT || 8080)
