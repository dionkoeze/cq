const m = require('mithril')

const connect = require('./io_connect')
connect()

const DataComponent = require('./data_component')

m.mount(document.getElementById('app'), DataComponent)

