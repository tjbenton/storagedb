
/*!
 * StorageDB JavaScript Library v0.0.5
 * https://github.com/tjbenton/storagedb
 */
  
import window from 'window';

function sequencialCallbacks(values, callback, finalCallback) {
  var index = 0;

  return {
    next: function next() {
      if (index < values.length) {
        callback(values[index++]);
      } else {
        call(finalCallback, null, values);
      }
    }
  };
}

function multipleCallbacks(times, callback) {
  var values = [];

  return {
    countDown: function countDown(value) {
      values.push(value);
      if (values.length === times) {
        call(callback, null, values);
      }
    }
  };
}

function noop() {}

function call(callback) {
  if (callback) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    if (!args.length) {
      args[0] = null;
    }
    callback.apply(undefined, args);
  }
}

function toType(arg) {
  return Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
}

function extend(target) {
  for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  for (var _i = 0; _i < args.length; _i++) {
    var source = args[_i];
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        if (toType(source[prop]) === 'object') {
          target[prop] = toType(target[prop]) === 'object' ? extend(target[prop], source[prop]) : source[prop];
        } else {
          target[prop] = source[prop];
        }
      }
    }
  }

  return target;
}

var local = function (_ref, use_session) {
  var name = _ref.name,
      key = _ref.id;

  var storage = void 0,
      type = void 0;
  try {
    if (use_session) {
      storage = window.sessionStorage;
      type = 'sessionStorage';
    } else {
      storage = window.localStorage;
      type = 'localStorage';
    }
  } catch (e) {
    return;
  }

  return {
    type: type,
    set: function set(value, callback) {
      var stored = JSON.parse(storage.getItem(name)) || [];

      var updated = false;

      for (var i = 0; i < stored.length; i++) {
        if (stored[i][key] === value[key]) {
          updated = true;
          stored[i] = value;
          break;
        }
      }

      if (!updated) {
        stored.push(value);
      }

      storage.setItem(name, JSON.stringify(stored));

      call(callback, null, value);
    },
    setAll: function setAll(values, callback) {
      var responseCallback = multipleCallbacks(values.length, callback);
      for (var _i = 0; _i < values.length; _i++) {
        var value = values[_i];
        this.set(value, responseCallback.countDown);
      }
    },
    get: function get(id, callback) {
      var jsonString = storage.getItem(name);
      if (jsonString) {
        var stored = JSON.parse(jsonString) || [];

        for (var i = 0; i < stored.length; i++) {
          if (stored[i][key] === id) {
            call(callback, null, stored[i]);
            return;
          }
        }
        return call(callback);
      }
      call(callback);
    },
    getAll: function getAll(callback) {
      var value = storage.getItem(name);
      call(callback, null, value ? JSON.parse(value) : []);
    },
    remove: function remove(id, callback) {
      call(callback);
      var jsonString = storage.getItem(name);
      if (jsonString) {
        var stored = JSON.parse(jsonString);
        for (var i = 0; i < stored.length; i++) {
          if (stored[i][key] === id) {
            stored.splice(i, 1);
            storage.setItem(name, JSON.stringify(stored));
            return;
          }
        }
      }
    },
    removeAll: function removeAll(callback) {
      storage.removeItem(name);
      call(callback);
    },

    close: noop
  };
};

var session = function (options) {
  return local(options, true);
};

var project = 'storagedb';

var indexed = function (_ref) {
  var name = _ref.name,
      key = _ref.id,
      debug = _ref.debug;

  var indexed_db = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
  var db = void 0;

  var pending = [];

  function createWrapper(fn_name) {
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (db) {
        result[fn_name].apply(result, args);
      } else {
        pending.push(function () {
          return result[fn_name].apply(result, args);
        });
      }
    };
  }

  function createObjectStore(callback) {
    debug('IndexedDB: going to create objectStore ' + name);
    db.close();
    var version = db.version + 1;
    var versionRequest = indexed_db.open(project, version);
    versionRequest.onupgradeneeded = function () {
      db = versionRequest.result;
      db.createObjectStore(name, { keyPath: key });
    };
    versionRequest.onsuccess = function () {
      debug('IndexedDB: created objectStore ' + name);
      callback();
    };
    versionRequest.onerror = function (e) {
      return callback(e);
    };
  }

  function objectStore() {
    var transaction = db.transaction([name], 'readwrite');
    transaction.onerror = logError;
    return transaction.objectStore(name);
  }

  function init(storage_set) {
    extend(result, storage_set);
    for (var _i = 0; _i < pending.length; _i++) {
      var item = pending[_i];
      item();
    }
  }

  function switchToLocal(err) {
    debug('An error ocurred: switching to localStorage', err);
    debug('pending:', pending);
    init(local);
  }

  function logError(err) {
    debug('IndexedDB Error: ' + err.message + ' (Code ' + err.code + ')', err);
  }

  var is_ie = /Trident\/|MSIE|Edge\//.test(window.navigator.userAgent);
  if (indexed_db && !is_ie) {
    // Now we can open our database
    var request = indexed_db.open(project);

    request.onsuccess = function () {
      db = request.result;
      if (!db.objectStoreNames.contains(name)) {
        createObjectStore(function (err) {
          if (err) return switchToLocal(err);
          debug('pending:', pending);
          init(indexed_db_functions);
        });
      } else {
        debug('pending:', pending);
        init(indexed_db_functions);
      }
    };

    request.onerror = switchToLocal;
  } else {
    return false;
  }

  var result = {
    type: 'indexedDB',
    set: createWrapper('set'),
    setAll: createWrapper('setAll'),
    get: createWrapper('get'),
    getAll: createWrapper('getAll'),
    remove: createWrapper('remove'),
    removeAll: createWrapper('removeAll'),
    close: createWrapper('close')
  };

  var indexed_db_functions = {
    set: function set(value, callback) {
      try {
        var _request = objectStore().put(value);
        _request.onsuccess = function () {
          return call(callback, null, value);
        };
        _request.onerror = logError;
      } catch (err) {
        // err code 3 and 8 are not found on chrome and canary respectively
        if (err.code !== 3 && err.code !== 8) {
          logError(err);
          call(callback, err);
        } else {
          debug('IndexedDB: going to create objectStore ' + name);
          createObjectStore(function () {
            indexed_db_functions.set(value, callback);
          });
        }
      }
    },
    setAll: function setAll(values, callback) {
      var seqWrapper = sequencialCallbacks(values, function (value) {
        indexed_db_functions.set(value, seqWrapper.next);
      }, callback);
      seqWrapper.next();
    },
    get: function get(id, callback) {
      try {
        objectStore().get(id).onsuccess = function (event) {
          call(callback, null, event.target.result);
        };
      } catch (err) {
        logError(err);
        call(callback, err);
      }
    },
    getAll: function getAll(callback) {
      try {
        var store = objectStore();

        // use getAll if avialable, else do it the old way
        if (store.getAll) {
          store.getAll().onsuccess = function (e) {
            call(callback, null, e.target.result);
          };
        } else {
          var objectArray = [];
          store.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
              objectArray.push(cursor.value);
              cursor.continue();
            } else {
              call(callback, null, objectArray);
            }
          };
        }
      } catch (err) {
        call(callback, err, []);
      }
    },
    remove: function remove(id, callback) {
      if (!db.objectStoreNames.contains(name)) {
        debug('IndexedDB: missing objectStore ' + name);
        call(callback);
      } else {
        var remove = objectStore().delete(id);
        remove.onerror = remove.onsuccess = function () {
          return call(callback);
        };
      }
    },
    removeAll: function removeAll(callback) {
      try {
        var clear = objectStore().clear();
        clear.onerror = clear.onsuccess = function () {
          call(callback);
        };
      } catch (err) {
        // err code 3 and 8 are not found on chrome and canary respectively
        if (err.code !== 3 && err.code !== 8) {
          logError(err);
        }
      }
    },
    close: function close() {
      db.close();
    }
  };

  return result;
};

function storageSet(name, options) {
  if (toType(name) === 'object') {
    options = name;
    // eslint is broken
    name = options.name; // eslint-disable-line prefer-destructuring
  }
  options = extend({
    name: name,
    type: null,
    id: 'id',
    debug: false
  }, options || {});

  options.debug = options.debug ? function () {
    var _console;

    return (_console = console).log.apply(_console, arguments);
  } : function () {};

  if (!name) {
    throw new Error('you must pass in a entity to storageSet');
  }

  var types = {
    'indexed-db': indexed,
    'local-storage': local,
    'session-storage': session
  };
  var types_to_try = Object.keys(types);
  if (options.type) {
    types_to_try.unshift(options.type);
  }

  for (var _i = 0; _i < types_to_try.length; _i++) {
    var key = types_to_try[_i];
    var storage = types[key] && types[key](options);
    if (storage) {
      storage.clear = storage.removeAll;
      return storage;
    }
  }

  throw new Error('You can only use one of these types for storagedb ' + types_to_try.join(', '));
}

export default storageSet;
