const m = require('mithril')
const cq = require('./cq_client')

const connect = require('./io_connect')

const State = require('./state2')
const ListState = require('./list_state')

const UserComponent = {
    view() {
        return m('.user', [
            m('label[for=user__input]', 'Your name:'),
            m('input#user__input.user__input', {
                onchange(e) {
                    // console.log(window.socket)
                    connect(e.target.value)
                },
            })
        ])
    },
}

function ItemComponent() {
    const state = new State()
    state.set('remote', '')
    state.set('status', '')
    state.observe('local', 'remote')

    return {
        view(vnode) {
            state.set('remote', vnode.attrs.string)
            return m('li.list__item', [
                m('input.list__edit[type=text][required]', {
                    value: state.get('local'),
                    onfocus() {
                        cq.once('edit-status', {
                            string: state.get('remote'),
                            editing: true,
                        })
                    },
                    onblur() {
                        cq.once('edit-status', {
                            string: state.get('local'),
                            editing: false,
                        })
                    },
                    onchange(e) {
                        state.set('local', e.target.value)
                        state.set('status', 'saving...')
                        cq.once('change-string', {
                            from: state.get('remote'),
                            to: state.get('local'),
                        }, () => {
                            state.unset('local')
                            state.set('status', '')
                            state.timed('status', 'saved!', 2000, () => m.redraw())
                        })
                    },
                }),
                m('.list__status', state.get('status')),
                m('ul.list_editors', vnode.attrs.editors)
            ])
        }
    }
}

const ListComponent = {
    view() {
        return m('ul.list', ListState.get('list').map((string, idx) => m(ItemComponent, {string, editors: ListState.get('editors')[idx]})))
    }
}

const CreateComponent = {
    view() {
        return m('form.create', {
            onsubmit(e) {
                e.preventDefault()
                ListState.set('status', 'saving...')

                cq.once('new-string', {string: e.target[0].value}, response => {
                    const status = response.success ? `saved '${response.added}'` : 'problem!'
                    ListState.timed('status', status, 5000, () => m.redraw())
                })

                e.target[0].value = ''
            },
        }, [
            m('label.create__label', 'Enter new data'),
            m('input.create__input[type=text][required][placeholder=type something]'),
            m('input.create__submit[type=submit][value=Save]'),
            m('.create__status', ListState.get('status')),
        ])
    }
}

module.exports = {
    view() {
        return m('.data', [
            m(UserComponent),
            m(ListComponent),
            m(CreateComponent),
        ])
    }
}
