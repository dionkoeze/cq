# Shared Active Context (SAC) 
(we might need a better name...)

A context is built from a `config` object. This object contains all data and functions for the context to operate. This file contains some docs on how to write a config object.

## Basic information
A config needs to contain the name of the context. Clients request to join a context by name and with parameters. If a client supplies different parameters a different and new context is created.

```js
const config = {
    name: 'my_context',
}
```

## Identifying clients
In order to recognize clients after a reconnect or some other disruption they should be identifiable. This enables a use case where a client remains in a context even when disconnected from the server for a while.

To make this work clients are authenticated and authorized via another route (not through contexts). Clients submit their token (or any other JS object) when communicating to a context.

## Context creation
When a context is created the config can determine whether the parameters that are send by the client are valid. Only if they are valid the context will be created. Note that a different context is created when different parameters are supplied by a client.

The method `valid` is called with the parameters supplied by the client. If an exception is thrown the context is not created and the error is sent to the client.

```js
const config = {
    async is_valid(params) {
        if (!params.count) throw new Error('error: needs count')
    },
}
```

After the parameters are determined to be valid the `config` can do some set up work. The `init` method is called with callbacks that trigger an update of the data and of the status. Another callback triggering teardown of the context is also supplied.

It's expected not to throw and it cannot alter the flow of context creation. It is only intended to have side effects.

```js
const config = {
    async init(update_data, update_status, close) {
        // use callbacks in triggering
    }
}
```

## Joining contexts
The client connects with an auth object that can be checked by the config of the context the client wants to join. It contains whatever the client thinks is relevant for authentication and authorization. 

The `authorize` function must return the unique `client id`!

```js
const config = {
    async authorize(auth) {
        const token = jwt.verify(token, 'secret')

        if (!/*check token*/) throw new Error('token expired')

        return token.id // or fetch from database
    },
}
```

Whenever a client is allowed to join a context according to authentication and authorization rules the context gets to decide whether the client can join given the current clients that are joined.

Expected to return `undefined` if client can join, anything else if not. The object that the function returns is given to the client. It is given the client id returned by `authorize` and a `Set` containing already joined client ids.

```js
const config = {
    async can_join(client, clients) {
        // only one can be connected at a time
        if (clients.size > 0) {
            return {
                type: 'full',
                message: 'only one client at a time',
            }
        }
    }
}
```

## Updating context data
Context data is updated by calling the `data` method of the config object. 

It's expected this method never throws!

```js
const config = {
    async data() {
        return ['item 1', 'item 2']
    },
}
```

## Updating membership status
Membership status is updated by calling the `status` method of the config object. 

It's expected this method never throws!

```js
const config = {
    async status(clients) {
        // active clients are stored somewhere
        // only active clients may do updates
        // others are allowed in, but no edits
        return {
            active: get_active_clients(),
            all: Array.from(clients),
        }
    }
}
```

## Handling requests
Within a context clients can make requests that are answered with responses produced by the `config`. All requests are function in the `requests` property. The return value of a function is the response.

If the data or membership status of the context needs to be changed that happens through registering triggering in the `init` method and emitting some triggering event when a request led to changes in data.

```js
const config = {
    requests: {
        async update(params) {
            // change data

            // emit triggering event

            return response
        },
        async remove(params) {
            // change data
            
            // emit triggering event

            return response
        }
    },
}
```

## Leaving contexts
When a client decides to leave a context the `config` can update its state. The associated client id is provided.

It's expected to not throw exceptions!

```js
const config = {
    async on_leave(client) {

    }
}
```

When a socket connection is lost and the client goes missing the `config` can decide what to do with this, e.g. change the membership status or not.

```js
const config = {
    async on_missing(client) {
        return true // return whether client should stay in context
    }
}
```

## Closing contexts
When a context is closed the `config` is removed and all clients connected to active contexts are notified it is terminated.