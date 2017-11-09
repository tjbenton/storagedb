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
    db.close()
    const version = db.version + 1
    const versionRequest = indexed_db.open(project, version)
    versionRequest.onupgradeneeded = () => {
      db = versionRequest.result
      db.createObjectStore(name, { keyPath: key })
    }
    versionRequest.onsuccess = (e) => callback(null, e)
  }

  function init(storage_set) {
    extend(result, storage_set)
    for (const item of pending) {
      item()
    }
  }

  const is_ie = /Trident\/|MSIE|Edge\//.test(window.navigator.userAgent)
  if (indexed_db && !is_ie) {
    // Now we can open our database
    const request = indexed_db.open(project)

    request.onsuccess = () => {
      db = request.result
      init(indexed_db_functions)
      debug('pending:', pending)
    }
    request.onerror = (event) => {
      debug('An error ocurred: switching to localStorage', event)
      init(local)
    }
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
        if (!db.objectStoreNames.contains(name)) {
          debug(`IndexedDB: going to create objectStore ${name}`)
          createObjectStore(() => {
            debug(`IndexedDB: created objectStore ${name}`)
            indexed_db_functions.set(value, callback)
          })
          return
        }

        const transaction = db.transaction([ name ], 'readwrite')
        const objectStore = transaction.objectStore(name)
        const request = objectStore.put(value)
        transaction.onerror = (error) => {
          debug(`IndexedDB Error: ${error.message} (Code ${error.code})`, error)
        }
        request.onsuccess = (e) => call(callback, null, e)
        request.onerror = (err) => {
          debug(`IndexedDB Error: ${err.message} (Code ${err.code})`, err)
        }
      } catch (err) {
        // err code 3 and 8 are not found on chrome and canary respectively
        if (err.code !== 3 && err.code !== 8) {
          debug(`IndexedDB Error: ${err.message} (Code ${err.code})`, err)
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
        if (!db.objectStoreNames.contains(name)) {
          debug(`IndexedDB: missing objectStore ${name}`)
          call(callback)
        } else {
          const transaction = db.transaction([ name ], 'readwrite')
          transaction.onerror = (error) => {
            debug(`IndexedDB Error: ${error.message} (Code ${error.code})`, error)
          }
          const objectStore = transaction.objectStore(name)
          objectStore.get(id).onsuccess = (event) => {
            call(callback, null, event.target.result)
          }
        }
      } catch (error) {
        debug(`IndexedDB Error: ${error.message} (Code ${error.code})`, error)
        call(callback, error)
      }
    },

    getAll(callback) {
      try {
        const objectArray = []
        if (!db.objectStoreNames.contains(name)) {
          debug(`IndexedDB: missing objectStore ${name}`)
          call(callback, null, objectArray)
        } else {
          const transaction = db.transaction([ name ], 'readwrite')
          transaction.onerror = (error) => {
            debug(`IndexedDB Error: ${error.message} (Code ${error.code})`, error)
          }
          const objectStore = transaction.objectStore(name)
          objectStore.openCursor().onsuccess = (event) => {
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
        const transaction = db.transaction([ name ], 'readwrite')
        const objectStore = transaction.objectStore(name)
        objectStore.delete(id).onsuccess = () => call(callback)
      }
    },

    removeAll(callback) {
      indexed_db_functions.close()
      const version = db.version + 1
      const request = indexed_db.open(project, version)
      request.onupgradeneeded = () => {
        try {
          db = request.result
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name)
          }
        } catch (error) {
          // error code 3 and 8 are not found on chrome and canary respectively
          if (error.code !== 3 && error.code !== 8) {
            debug(`IndexedDB Error: ${error.message} (Code ${error.code})`, error)
          }
        }
      }
      request.onsuccess = (e) => {
        call(callback, null, e)
      }
    },

    close() {
      db.close()
    },
  }

  return result
}
