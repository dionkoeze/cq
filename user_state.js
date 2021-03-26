const State = require('./state2')

const state = new State('userState')

state.set('known', false)
state.set('name', '')

module.exports = state