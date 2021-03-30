const m = require('mithril')
const cq = require('../cq/cq_client')
const State = require('../state/state')

const ListState = new State('listState')

ListState.set('user', '')
ListState.set('list', [])
ListState.set('editors', [])
ListState.after_timed(() => m.redraw())

cq.start('get-list', {}, response => {
    ListState.set('list', response)
    m.redraw()
})

cq.start('editors', {}, response => {
    ListState.set('editors', response)
    m.redraw()
})

module.exports = ListState