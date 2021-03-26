const m = require('mithril')
// const cq = require('./cq_client')

const connect = require('./io_connect')
connect()

const DataComponent = require('./data_component')

m.mount(document.getElementById('app'), DataComponent)

