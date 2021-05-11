function split_path(str) {
    const re = /([^\/\s]+)\/?(\S*)/
    // match produces: [original , first group , second group]
    const [ , resource, remainder] = str.match(re)
    return [resource, remainder]
}

class TreeEventEmitterNode {
    constructor(resource, remainder, callback) {
        this.resource = resource
        this.children = new Map()

        this.touched = false
        this.callbacks = []

        if (!!remainder) {
            this.on(remainder, callback)
        } else if (!!resource) {
            this.callbacks.push(callback)
        }
    }

    on(path, callback) {
        const [resource, remainder] = split_path(path)
        
        if (this.children.has(resource)) {
            if (!!remainder) {
                this.children.get(resource).on(remainder, callback)
            } else {
                this.children.get(resource).callbacks.push(callback)
            }
        } else {
            this.children.set(resource, new TreeEventEmitterNode(resource, remainder, callback))
        }
    }

    detach(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback)

        this.children.forEach(child => child.detach(callback))
    }

    touch(path) {
        this.touched = true

        if (!!path) {
            const [resource, remainder] = split_path(path)
    
            if (this.children.has(resource)) {
                this.children.get(resource).touch(remainder)
            }
        }
    }

    async emit() {
        if (this.touched) {
            this.touched = false

            await Promise.all(this.callbacks.forEach(cb => cb()))
        }

        this.children.forEach(child => child.emit())
    }

    gc() {
        this.children.forEach(child => child.gc())
        
        Array.from(this.children.keys()).forEach(key => {
            if (this.children.get(key).callbacks.size === 0) {
                this.children.delete(key)
            }
        })
    }

    // for debugging purposes
    print(prefix = '') {
        console.log(`${prefix}${this.resource} : ${this.touched} : ${this.callbacks}`)

        this.children.forEach(child => child.print(prefix + '  '))
    }
}

class TreeEventEmitter {
    constructor() {
        this.root = new TreeEventEmitterNode()
        this.scheduled = false
    }

    on(path, callback) {
        this.root.on(path, callback)
    }

    detach(callback) {
        this.root.detach(callback)
        this.root.gc()
    }

    emit(path) {
        this.schedule()
        this.root.touch(path)
    }

    schedule() {
        if (!this.scheduled) {
            this.scheduled = true
            setTimeout(async () => {
                await this.root.emit()
                this.scheduled = false
            }, 0)
        }
    }

    // debugging
    print() {
        this.root.print()
    }
}

// const tree = new TreeEventEmitter()

// const a = () => console.log('A')
// const abc = () => console.log('ABC')
// const ab = () => console.log('AB')
// const x = () => console.log('extra')

// tree.on('A', a)
// tree.on('A/B/C', abc)
// tree.on('A/B', ab)
// tree.on('A/B', x)

// tree.print()

// tree.emit('A/B')

// setTimeout(() => {
//     tree.detach(x)
    
//     tree.print()
    
//     tree.emit('A/B')
// }, 0);

module.exports = TreeEventEmitter
