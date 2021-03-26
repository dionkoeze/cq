/*

Overshadowing state. 

data, z-index, destructible



*/

class Block {
    constructor(data, permanent) {
        this.data = data,
        this.permanent = permanent
    }
}

function State() {
    const _props = new Map()

    function _optimize(arr) {
        let idx = 0

        for (let block, i of arr) {
            if (block.permanent) {
                idx = i
                break
            }
        }

        arr.splice(idx, arr.length())
    }

    function _insert(arr, data, z, permanent) {
        let idx = 0

        while (idx < arr.length() && arr[idx].z > z) idx += 1

        arr.splice(idx, 0, new Block(data, permanent))

        _optimize(arr)
    }

    function _set(name, data, z, permanent) {
        if (!_props.has(name)) _props.set(name, [])

        _insert(_props.get(name), data, z, permanent)
    }

    return {
        set(name, data, z = 0, persistence = 'memory') {
            _set(name, data, z, true)
        },
        set_timed(name, data, time, z = 0, persistence = 'memory') {
            let destruct = this.set_destructible(name, data, z)
            setTimeout(() => destruct(), time)
        },
        set_query(query, name, z = 0, persistence = 'memory', callback = undefined) {

        },
        set_destructible(name, data, z = 0, persistene = 'memory') {

        },
    }
}

module.exports = State



state.set('data', data) // [data0]

state.set('data', data, 1) // [data1, data0]
state.set('data', data, -1) // [data1, data0, data-1]

const destruct = state.set_destructible('data', data, 10)

state.set_timed('data', data, 5000)

state.set_query('query', 'data', 30, (response) => {
    do_something_with(response)
})

let destruct
function update(response) {
    destruct()
    destruct = state.set('resp', response, 20, true)
}