const m = require('mithril')

const connect = require('./io_connect')
connect()

const cq = require('../cq/cq_client')

cq.after(m.redraw()) // this does trigger more often than strictly necessary...

const DataComponent = require('./data_component')

m.mount(document.getElementById('app'), DataComponent)

