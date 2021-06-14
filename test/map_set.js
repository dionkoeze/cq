const MapSet = require("../sac/map_set")

describe('MapSet', () => {
    let ms

    beforeEach(() => {
        ms = new MapSet()
    })

    it('is constructed empty', () => {
        ms.size.should.be.a.Number().and.exactly(0)
    })

    it('adds values on non-existing keys', () => {
        ms.add('a', 4)
        ms.size.should.be.exactly(1)
        ms.sizeKey('a').should.be.exactly(1)
        ms.hasValue('a', 4).should.be.true()
    })

    it('adds values on existing keys', () => {
        ms.add('a', 1)
        ms.add('a', 2)
        ms.size.should.be.exactly(1)
        ms.sizeKey('a').should.be.exactly(2)
    })

    it('deletes existing keys', () => {
        ms.add('a', 1)
        ms.add('b', 1)
        ms.size.should.be.exactly(2)
        ms.delete('a')
        ms.size.should.be.exactly(1)
        ms.hasKey('a').should.be.false()
        ms.hasKey('b').should.be.true()
    })

    it('fails silently when deleting non-existing keys', () => {
        ms.delete('a')
        ms.size.should.be.exactly(0)
    })

    it('deletes existing values', () => {
        ms.add('a', 1)
        ms.add('a', 2)
        ms.sizeKey('a').should.be.exactly(2)
        ms.deleteValue('a', 1)
        ms.sizeKey('a').should.be.exactly(1)
        ms.hasValue('a', 1).should.be.false()
        ms.hasValue('a', 2).should.be.true()
    })

    it('fails silently when deleting non-existing values', () => {
        ms.add('a', 1)
        ms.deleteValue('a', 2)
        ms.size.should.be.exactly(1)
        ms.hasValue('a', 1).should.be.true()
    })

    it('fails silently when deleting values of non-existing keys', () => {
        ms.deleteValue('a', 1)
        ms.size.should.be.exactly(0)
    })

    it('returns true when checking for existing key', () => {
        ms.add('a', 1)
        ms.hasKey('a').should.be.true()
    })

    it('returns false when checking for non-existing key', () => {
        ms.hasKey('a').should.be.false()
    })

    it('returns true when checking for existing key,value', () => {
        ms.add('a', 1)
        ms.hasValue('a', 1).should.be.true()
    })

    it('returns false when checking for existing key, non-existing value', () => {
        ms.add('a', 1)
        ms.hasValue('a', 2).should.be.false()
    })

    it('returns false when checking for non-existing key, value', () => {
        ms.hasValue('a', 1).should.be.false()
        ms.add('a', 1)
        ms.hasValue('b', 2).should.be.false()
    })

    it('can be cleared when empty', () => {
        ms.clear()
        ms.size.should.be.exactly(0)
    })

    it('can be cleared when not empty', () => {
        ms.add('a', 4)
        ms.size.should.be.exactly(1)
        ms.clear()
        ms.size.should.be.exactly(0)
    })

    it('has key size for existing keys', () => {
        ms.add('a', 1)
        ms.sizeKey('a').should.be.a.Number().and.exactly(1)
    })

    it('has key size zero for non-existing keys', () => {
        ms.sizeKey('a').should.be.a.Number().and.exactly(0)
    })

    describe('iteration', () => {
        beforeEach(() => {
            ms.add('a', 1)
            ms.add('a', 2)

            ms.add('b', 1)
            ms.add('b', 2)
        })

        it('iterates over keys', () => {
            let found_a = false
            let found_b = false

            ms.forEachKey(key => {
                if (key === 'a') found_a = true
                if (key === 'b') found_b = true
            })

            found_a.should.be.true()
            found_b.should.be.true()
        })
    
        it('iterates over values of a specific key', () => {
            let found_1 = false
            let found_2 = false

            ms.forEachValue('a', value => {
                if (value === 1) found_1 = true
                if (value === 2) found_2 = true
            })

            found_1.should.be.true()
            found_2.should.be.true()
        })
    
        it('iterates over all keys and values', () => {
            let found_a1 = false
            let found_a2 = false
            let found_b1 = false
            let found_b2 = false

            ms.forEachKeyValue((key, value) => {
                if (key === 'a' && value === 1) found_a1 = true
                if (key === 'a' && value === 2) found_a2 = true
                if (key === 'b' && value === 1) found_b1 = true
                if (key === 'b' && value === 2) found_b2 = true
            })

            found_a1.should.be.true()
            found_a2.should.be.true()
            found_b1.should.be.true()
            found_b2.should.be.true()
        })
    })

    it('has an array of all keys', () => {
        ms.add('a', 1)
        ms.add('a', 2)
        ms.add('b', 1)

        ms.keys.should.be.eql(['a', 'b'])
    })
})