const m = require('mithril')
const cq = require('../cq/cq_client')

const connect = require('./io_connect')

const State = require('../state/state')
const ListState = require('./list_state')

const UserComponent = {
    view() {
        return m('.user', [
            m('label[for=user__input]', 'Your name:'),
            m('input#user__input.user__input', {
                oninput(e) {
                    e.preventDefault()
                    connect(e.target.value)
                    ListState.set('user', e.target.value)
                },
            })
        ])
    },
}

const FieldStaticComponent = {
    view(vnode) {
        return m('.list_static', vnode.attrs.state.get('local'))
    }
}

const FieldEditComponent = {
    view(vnode) {
        return m('input.list__edit[type=text][required]', {
            style: {
                width: '90%',
            },
            value: vnode.attrs.state.get('local'),
            onfocus(e) {
                e.preventDefault()
                cq.once('edit-status', {
                    id: vnode.attrs.state.get('id'),
                    editing: true,
                })
            },
            onblur(e) {
                e.preventDefault()
                cq.once('edit-status', {
                    id: vnode.attrs.state.get('id'),
                    editing: false,
                })
            },
            oninput(e) {
                e.preventDefault()
                vnode.attrs.state.set('local', e.target.value)
                vnode.attrs.state.set('status', 'saving...')
                cq.once('change-string', {
                    id: vnode.attrs.state.get('id'),
                    string: vnode.attrs.state.get('local'),
                }, () => {
                    vnode.attrs.state.unset('local')
                    vnode.attrs.state.set('status', '')
                    vnode.attrs.state.timed('status', 'saved!', 2000)
                })
            },
        })
    }
}

function ItemComponent() {
    const state = new State()
    state.set('remote', '')
    state.set('id', '')
    state.set('status', '')
    state.observe('local', 'remote')
    state.after_timed(() => m.redraw())

    return {
        view(vnode) {
            state.set('remote', vnode.attrs.entry.string)
            state.set('id', vnode.attrs.entry.id)
            return m('li.list__item', [
                ListState.get('user') !== '' ? m(FieldEditComponent, {state}) : m(FieldStaticComponent, {state}),
                m('.list__status', state.get('status')),
                m('.list__editors', vnode.attrs.editors)
            ])
        }
    }
}

const ListComponent = {
    view() {
        const editors = ListState.get('editors')
        function make_list(names) {
            if (names !== undefined && names.length > 0) {
                return names.reduce((acc, ed) => acc + ' ' + ed, 'Editing by:')
            } else {
                return ''
            }
        }
        return m('ul.list', ListState.get('list').map((entry, idx) => m(ItemComponent, {entry, editors: make_list(editors[idx])})))
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
                    ListState.timed('status', status, 5000)
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
