import window from 'window'
import { multipleCallbacks, noop, call } from '../utils'

export default function({ name, id: key }, use_session) {
  let storage, type
  try {
    if (use_session) {
      storage = window.sessionStorage
      type = 'sessionStorage'
    } else {
      storage = window.localStorage
      type = 'localStorage'
    }
  } catch (e) {
    return
  }

  return {
    type,
    set(value, callback) {
      const stored = JSON.parse(storage.getItem(name)) || []

      let updated = false

      for (let i = 0; i < stored.length; i++) {
        if (stored[i][key] === value[key]) {
          updated = true
          stored[i] = value
        }
      }

      if (!updated) {
        stored.push(value)
      }

      storage.setItem(name, JSON.stringify(stored))

      call(callback)
    },
    setAll(values, callback) {
      // @todo update this to node style callback
      const responseCallback = multipleCallbacks(values.length, callback)
      for (const value of values) {
        this.set(value, responseCallback.countDown)
      }
    },
    get(id, callback) {
      const jsonString = storage.getItem(name)
      if (jsonString) {
        const stored = JSON.parse(jsonString) || []

        for (let i = 0; i < stored.length; i++) {
          if (stored[i][key] === id) {
            call(callback, null, stored[i])
            return
          }
        }
        return call(callback)
      }
      call(callback)
    },
    getAll(callback) {
      const value = storage.getItem(name)
      call(callback, null, value ? JSON.parse(value) : [])
    },
    remove(id, callback) {
      call(callback)
      const jsonString = storage.getItem(name)
      if (jsonString) {
        const stored = JSON.parse(jsonString)
        for (let i = 0; i < stored.length; i++) {
          if (stored[i][key] === id) {
            stored.splice(i, 1)
            storage.setItem(name, JSON.stringify(stored))
            return
          }
        }
      }
    },
    removeAll(callback) {
      storage.removeItem(name)
      call(callback)
    },
    close: noop,
  }
}
