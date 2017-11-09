# storagedb

Zero dependency javascript Library for cross browser local storage, it supports LocalStorage, SessionStorage, and IndexedDB. WebSQL will not be supported because it's deprecated.

Basically it allows us to use any of the storage technologies in a standard way.

## Usage


```js
// name is the value database name to store everything in
const storage = storagedb('database-name', {
  type: null, // 'indexed-db', 'local-storage', 'session-storage' or it will be determined for you
  id: 'id', // this is used to determine the unique id you're using on the object you're storing
  debug: false, // if true then debugging information will be logged
})

// you can also pass in just an options object
const storage = storagedb({
  name: 'database-name',
  type: null, // 'indexed-db', 'local-storage', 'session-storage' or it will be determined for you
  id: 'id', // this is used to determine the unique id you're using on the object you're storing
  debug: false, // if true then debugging information will be logged
})
```

After you get your storage solution this is how you can use each of the functions that have been normalized for your convenience.

*Note:* that each of the callbacks is in node js style so `err` will always be the first argument, then the value



#### set
Stores an object of a given entity. If an object with the same id exists it updates the stored object.

```js
storage.set(value, callback(err))
```

```js
storage.set({ id: 'woohoo', value: 'the woohoo id is pretty awesome' }, (err) => {
  if (err) console.log('err:', err);
})
```

Note that if you change what the id is in the initial options you can customize it to fit your needs.

```js
const storage = storagedb('my-storage', { id: 'database' })

storage.set({ database: 'device', info: { ... } })
```


#### setAll
Stores the objects that are passed into values. If objects with the same ids exist it updates the stored objects.

```js
storage.setAll(values, callback(err))
```

#### get
Retrieves a specified object of a given entity. The results are passed through the callback.

```js
storage.get(id, callback(err, value))
```

```js
const storage = storagedb('my-storage')
const id = 'something';
storage.set({ id, value: 'Lorem ipsum dolor sit amet' }, (err) => {
  if (err) return console.log('set err:', err);

  storage.get(id, (err, value) => {
    if (err) return console.log('get err:', err);

    console.log('value:', value) // => { id: 'something', value: 'Lorem ipsum dolor sit amet' }
  })
})

```

#### getAll
Retrieves all objects of a given entity. This function has no return. The results are passed through the callback.

```js
storage.getAll(callback(err, values))
```


#### remove

Removes a specific entry

```js
storage.remove(id, callback(err))
```

```js
const storage = storagedb('my-storage')
const id = 'something';
storage.set({ id, value: 'Lorem ipsum dolor sit amet' }, (err) => {
  if (err) return console.log('set err:', err);

  storage.remove(id, (err) => {
    if (err) return console.log('remove err:', err);
  })
})
```

#### removeAll (alias storage.clear)
Removes all the entries for a given entity.

```js
storage.removeAll(callback(err))
storage.clear(callback(err))
```

```js
const storage = storagedb('my-storage')
const id = 'something';
storage.set({ id, value: 'Lorem ipsum dolor sit amet' }, (err) => {
  if (err) return console.log('set err:', err);

  storage.removeAll((err) => {
    if (err) return console.log('remove err:', err);
  })
})
```

#### close
Closes the database connection. While this is not important for all implementations, it is good practice to close it if you no longer need it.

```js
storage.close()
```

## Known Limitations
If `indexed-db` is used only one connection can be established at a given time as external upgrades are not yet implemented.

## Future Versions
  - Implement the capability of external upgrades under IndexedDB.
  - Ability to query by something more than the object's id.
