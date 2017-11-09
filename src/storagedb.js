import local from './storage/local-storage.js'
import session from './storage/session-storage.js'
import indexed from './storage/indexed-db.js'
import { extend, toType } from './utils'

export default function storageSet(name, options) {
  if (toType(name) === 'object') {
    options = name
    // eslint is broken
    name = options.name // eslint-disable-line prefer-destructuring
  }
  options = extend({
    name,
    type: null,
    id: 'id',
    debug: false,
  }, options || {})

  options.debug = options.debug ? (...args) => console.log(...args) : () => {}

  if (!name) {
    throw new Error('you must pass in a entity to storageSet')
  }

  const types = {
    'indexed-db': indexed,
    'local-storage': local,
    'session-storage': session,
  }
  const types_to_try = Object.keys(types)
  if (options.type) {
    types_to_try.unshift(options.type)
  }

  for (const key of types_to_try) {
    const storage = types[key] && types[key](options)
    if (storage) {
      storage.clear = storage.removeAll
      return storage
    }
  }

  throw new Error(`You can only use one of these types for storagedb ${types_to_try.join(', ')}`)
}

