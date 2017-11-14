import window from 'window'

import { sequencialCallbacks, call, extend } from '../utils'
import local from './local-storage'
const project = 'storagedb'

export default function({ name, id: key, debug }) {
  const indexed_db = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB
  let db

  const pending = []

  function createWrapper(fn_name) {
    return (...args) => {
      if (db) {
        result[fn_name](...args)
      } else {
        pending.push(() => result[fn_name](...args))
      }
    }
  }

  function createObjectStore(callback) {
    debug(`IndexedDB: going to create objectStore ${name}`)
    db.close()
    const version = db.version + 1
    const versionRequest = indexed_db.open(project, version)
    versionRequest.onupgradeneeded = () => {
      db = versionRequest.result
      db.createObjectStore(name, { keyPath: key })
    }
    versionRequest.onsuccess = () => {
      debug(`IndexedDB: created objectStore ${name}`)
      callback()
    }
    versionRequest.onerror = (e) => callback(e)
  }

  function objectStore() {
    const transaction = db.transaction([ name ], 'readwrite')
    transaction.onerror = logError
    return transaction.objectStore(name)
  }

  function init(storage_set) {
    extend(result, storage_set)
    for (const item of pending) {
      item()
    }
  }

  function switchToLocal(err) {
    debug('An error ocurred: switching to localStorage', err)
    debug('pending:', pending)
    init(local)
  }

  function logError(err) {
    debug(`IndexedDB Error: ${err.message} (Code ${err.code})`, err)
  }

  const is_ie = /Trident\/|MSIE|Edge\//.test(window.navigator.userAgent)
  if (indexed_db && !is_ie) {
    // Now we can open our database
    const request = indexed_db.open(project)

    request.onsuccess = () => {
      db = request.result
      if (!db.objectStoreNames.contains(name)) {
        createObjectStore((err) => {
          if (err) return switchToLocal(err)
          debug('pending:', pending)
          init(indexed_db_functions)
        })
      } else {
        debug('pending:', pending)
        init(indexed_db_functions)
      }
    }

    request.onerror = switchToLocal
  } else {
    return false
  }

  const result = {
    type: 'indexedDB',
    set: createWrapper('set'),
    setAll: createWrapper('setAll'),
    get: createWrapper('get'),
    getAll: createWrapper('getAll'),
    remove: createWrapper('remove'),
    removeAll: createWrapper('removeAll'),
    close: createWrapper('close'),
  }


  const indexed_db_functions = {
    set(value, callback) {
      try {
        const request = objectStore().put(value)
        request.onsuccess = () => call(callback, null, value)
        request.onerror = logError
      } catch (err) {
        // err code 3 and 8 are not found on chrome and canary respectively
        if (err.code !== 3 && err.code !== 8) {
          logError(err)
          call(callback, err)
        } else {
          debug(`IndexedDB: going to create objectStore ${name}`)
          createObjectStore(() => {
            indexed_db_functions.set(value, callback)
          })
        }
      }
    },

    setAll(values, callback) {
      const seqWrapper = sequencialCallbacks(values, (value) => {
        indexed_db_functions.set(value, seqWrapper.next)
      }, callback)
      seqWrapper.next()
    },

    get(id, callback) {
      try {
        objectStore().get(id).onsuccess = (event) => {
          call(callback, null, event.target.result)
        }
      } catch (err) {
        logError(err)
        call(callback, err)
      }
    },

    getAll(callback) {
      try {
        const store = objectStore()

        // use getAll if avialable, else do it the old way
        if (store.getAll) {
          store.getAll().onsuccess = (e) => {
            call(callback, null, e.target.result)
          }
        } else {
          const objectArray = []
          store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
              objectArray.push(cursor.value)
              cursor.continue()
            } else {
              call(callback, null, objectArray)
            }
          }
        }
      } catch (err) {
        call(callback, err, [])
      }
    },

    remove(id, callback) {
      if (!db.objectStoreNames.contains(name)) {
        debug(`IndexedDB: missing objectStore ${name}`)
        call(callback)
      } else {
        const remove = objectStore().delete(id)
        remove.onerror = remove.onsuccess = () => call(callback)
      }
    },

    removeAll(callback) {
      try {
        const clear = objectStore().clear()
        clear.onerror = clear.onsuccess = () => {
          call(callback)
        }
      } catch (err) {
        // err code 3 and 8 are not found on chrome and canary respectively
        if (err.code !== 3 && err.code !== 8) {
          logError(err)
        }
      }
    },

    close() {
      db.close()
    },
  }

  return result
}
