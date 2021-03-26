const {v4: uuid} = require('uuid')

const memoryStorage = {
    data: new Map(),
    setItem(key, value) {
        this.data.set(key, value)
    },
    getItem(key) {
        if (this.data.has(key)) {
            return this.data.get(key)
        } else {
            return undefined
        }
    },
    removeItem(key) {
        this.data.delete(key)
    },
}

class Block {
    constructor(storage, name, init) {
        this.storage = storage
        this.name = name
        this.observes = undefined

        if (!!init) {
            this.data = init
        }
    }

    set data(value) {
        this.storage.setItem(this.name, JSON.stringify(value))
    }

    get data() {
        const local = this.storage.getItem(this.name)
        if (local !== undefined) {
            return JSON.parse(local)
        } else if (this.observes !== undefined) {
            return this.observes.data
        } else {
            return undefined
        }
    }

    empty() {
        this.storage.removeItem(this.name)
    }
}

class State {
    constructor(name) {
        if (!name) {
            this.name = uuid()
        } else {
            this.name = name
        }

        this.vars = new Map()
    }

    set(key, value) {
        if (!this.vars.has(key)) {
            this._create(memoryStorage, key)
        }

        this.vars.get(key).data = value
    }
    
    get(key) {
        if (this.vars.has(key)) {
            return this.vars.get(key).data
        } else {
            return undefined
        }
    }
    
    unset(key) {
        if (this.vars.has(key)) {
            this.vars.get(key).empty()
        }
    }
    
    timed(key, value, time, callback) {
        if (!this.vars.has(key)) {
            this._create(memoryStorage, key)
        }

        const block = this.vars.get(key)
        block.data = value
        
        setTimeout(() => {
            block.empty()

            if (callback) callback()
        }, time)
    }

    _create(storage, key) {
        let init = undefined
    
        if (this.vars.has(key)) {
            block = this.vars.get(key)
            init = block.data
            block.empty()
        }
    
        this.vars.set(key, new Block(storage, `${this.name}:${key}`, init))
    }

    memory(key) {
        this._create(memoryStorage, key)
    }

    session(key) {
        this._create(sessionStorage, key)
    }

    local(key) {
        this._create(localStorage, key)
    }

    observe(observer, observed) {
        if (!this.vars.has(observed)) return

        if (!this.vars.has(observer)) {
            this._create(memoryStorage, observer)
        }
        
        this.vars.get(observer).observes = this.vars.get(observed)
    }

    detach(key) {
        if (this.vars.has(key)) {
            this.vars.get(key).observes = undefined
        }
    }
}

module.exports = State


// function run() {
//     const s = new State('stateName')
//     console.log('stateName', s.name)

//     const s2 = new State()
//     console.log('<random uuid>', s2.name) // random uuid

//     s.set('keyA', {data: 'A'}) // in memory
//     console.log(1, {data: 'A'}, s.get('keyA')) // {data: 'A'}

//     s.memory('keyB') // in memory
//     s.session('keyC') // session persisted
//     s.local('keyD') // session persisted

//     s.set('keyB', {data: 'B'})
//     s.set('keyC', {data: 'C'})
//     s.set('keyD', {data: 'D'})

//     s.observe('keyE', 'keyA')
//     console.log(2, {data: 'A'}, s.get('keyE')) // {data: 'A'}
//     s.set('keyE', {data: 'E'})
//     console.log(3, {data: 'E'}, s.get('keyE')) // {data: 'E'}
//     s.unset('keyE')
//     console.log(4, {data: 'A'}, s.get('keyE')) // {data: 'A'}
//     s.decouple('keyE')
//     console.log(5, undefined, s.get('keyE')) // undefined

//     s.timed('keyF', {data: 'F'}, 2000, () => {console.log('from callback')})
//     console.log(6, {data: 'F'}, s.get('keyF')) // {data: 'F'}
//     // wait for 3000 ms
//     setTimeout(() => {
//         console.log(7, undefined, s.get('keyF')) // undefined
//     }, 3000)
// }

// module.exports = run