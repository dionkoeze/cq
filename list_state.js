const m = require('mithril')
const cq = require('./cq_client')
const State = require('./state2')

const ListState = new State('listState')

ListState.set('list', [])
ListState.set('editors', [])

cq.start('get-list', {filter: ''}, response => {
    ListState.set('list', response)
    m.redraw()
})

cq.start('editors', {}, response => {
    // console.log(response)
    ListState.set('editors', response)
    m.redraw()
})

module.exports = ListState