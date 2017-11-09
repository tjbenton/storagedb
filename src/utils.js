export function sequencialCallbacks(values, callback, finalCallback) {
  let index = 0

  return {
    next() {
      if (index < values.length) {
        callback(values[index++])
      } else {
        finalCallback()
      }
    },
  }
}

export function multipleCallbacks(times, callback) {
  const values = []

  return {
    countDown(value) {
      values.push(value)
      if (values.length === times) {
        callback(values)
      }
    },
  }
}


export function noop() {}


export function call(callback, ...args) {
  if (callback) {
    if (!args.length) {
      args[0] = null
    }
    callback(...args)
  }
}


export function toType(arg) {
  return Object.prototype.toString.call(arg).slice(8, -1).toLowerCase()
}

export function extend(target, ...args) {
  for (const source of args) {
    for (const prop in source) {
      if (source.hasOwnProperty(prop)) {
        if (toType(source[prop]) === 'object') {
          target[prop] = toType(target[prop]) === 'object' ? extend(target[prop], source[prop]) : source[prop]
        } else {
          target[prop] = source[prop]
        }
      }
    }
  }


  return target
}
