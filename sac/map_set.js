class MapSet {
    constructor() {
        this.map = new Map()
    }

    hasKey(key) {
        return this.map.has(key)
    }

    hasValue(key, value) {
        return this.map.has(key) && this.map.get(key).has(value)
    }

    delete(key) {
        this.map.delete(key)
    }

    add(key, value) {
        if (!this.map.has(key)) {
            this.map.set(key, new Set())
        }

        this.map.get(key).add(value)
    }

    deleteValue(key, value) {
        if (this.map.has(key)) {
            this.map.get(key).delete(value)
        }
    }

    get size() {
        return this.map.size
    }

    sizeKey(key) {
        if (this.map.has(key)) {
            return this.map.get(key).size
        } else {
            return 0
        }
    }

    clear() {
        this.map.clear()
    }

    forEachKey(callback) {
        this.map.forEach((_, key) => callback(key))
    }

    forEachValue(key, callback) {
        if (this.map.has(key)) {
            this.map.get(key).forEach(callback)
        }
    }

    forEachKeyValue(callback) {
        this.map.forEach((set, key) => {
            set.forEach(value => callback(key, value))
        })
    }

    get keys() {
        return Array.from(this.map.keys())
    }
}

module.exports = MapSet