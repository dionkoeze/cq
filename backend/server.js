const express = require('express')
app = express()
const httpServer = require('http').createServer(app)
const io = require('socket.io')(httpServer)

const cq = require('../cq/cq_server')

let memData = ['apple', 'banana', 'berry', 'water']
let editors = [[], [], [], []]

cq.on('get-list', (params, update) => {
    // setTimeout(() => {
        update(memData.filter(val => val.includes(params.filter)))
    // }, 500)
})

cq.on('editors', (_, update) => {
    update(editors)
})

cq.on('edit-status', (params, update, auth) => {
    const idx = memData.findIndex(string => params.string === string)
    if (params.editing) {
        editors[idx].push(auth.name)
    } else {
        editors[idx] = editors[idx].filter(name => name !== auth.name)
    }
    update({
        success: true,
    })
    cq.trigger('editors')
})

cq.on('change-string', (params, update) => {
    // setTimeout(() => {
        memData = memData.map(str => str === params.from ? params.to : str)
    
        update({
            ...params,
            success: true,
        })
    
        cq.trigger('get-list')
    // }, 500)
})

cq.on('new-string', (params, update) => {
    // setTimeout(() => {
        if (!!params.string) {
            memData.push(params.string)
            editors.push([])
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
    // }, 500);
})

cq.init(io)

app.use('/', express.static(__dirname + '/../'))

httpServer.listen(process.env.PORT || 8080)
