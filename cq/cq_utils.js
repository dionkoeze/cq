const hash = require('object-hash')

// calculate unique key of query
function get_key(query) {
    return 'q:' + hash(query)
}

module.exports = {get_key}