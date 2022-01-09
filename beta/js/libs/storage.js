"use strict";
var IndexedDBStorageAdapter = (function () {
    function IndexedDBStorageAdapter(database, version) {
        this.database = database;
        this.version = version;
        var self = this;
        this.dbPromise = new Promise(function (resolve, reject) {
            var request = indexedDB.open(database, version);
            request.onupgradeneeded = self.upgrade.bind(self);
            request.onsuccess = function (event) {
                var db = event.target.result;
                resolve(db);
            };
            request.onerror = function (e) {
                console.log(e.error);
                reject(e);
            };
        });
    }
    IndexedDBStorageAdapter.prototype.upgrade = function (event) {
        throw Error('A custom upgrade function must be implemented to handle ' + event.toString());
    };
    IndexedDBStorageAdapter.prototype.keyCursor = function (storeName, indexName) {
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readonly"), store = transaction.objectStore(storeName), index = store.index(indexName);
            transaction.oncomplete = function () { };
            return new Promise(function (resolve, reject) {
                var request = index.openKeyCursor();
                request.onsuccess = function (event) {
                    resolve(event.target.result);
                };
                request.onerror = function (event) {
                    reject(event);
                };
            });
        });
    };
    IndexedDBStorageAdapter.prototype.getAll = function (storeName, indexName, range) {
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readonly"), store = transaction.objectStore(storeName);
            transaction.oncomplete = function () { };
            if (indexName && range) {
                var index = store.index(indexName), request = index.openCursor(range);
                return new Promise(function (resolve, reject) {
                    request.onsuccess = function (event) {
                        resolve(event.target.result);
                    };
                    request.onerror = function (event) {
                        reject(event);
                    };
                });
            }
            var request = store.getAll();
            return new Promise(function (resolve, reject) {
                request.onsuccess = function (event) {
                    resolve(event.target.result);
                };
                request.onerror = function (event) {
                    reject(event);
                };
            });
        });
    };
    IndexedDBStorageAdapter.prototype.get = function (storeName) {
        var ids = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            ids[_i - 1] = arguments[_i];
        }
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readonly"), store = transaction.objectStore(storeName);
            transaction.oncomplete = function () { };
            var promises = [];
            var _loop_1 = function () {
                var request = store.get(ids[i]), prom = new Promise(function (resolve, reject) {
                    request.onsuccess = function (response) { resolve(response); };
                    request.onerror = function (response) { reject(response); };
                });
                promises.push(prom);
            };
            for (var i = 0; i < ids.length; i++) {
                _loop_1();
            }
            return Promise.all(promises);
        });
    };
    IndexedDBStorageAdapter.prototype.add = function (storeName) {
        var items = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            items[_i - 1] = arguments[_i];
        }
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readwrite"), store = transaction.objectStore(storeName);
            var promises = [];
            var _loop_2 = function () {
                var request = store.add(items[i]), prom = new Promise(function (resolve, reject) {
                    request.onsuccess = function (response) { resolve(response); };
                    request.onerror = function (response) { reject(response); };
                });
                promises.push(prom);
            };
            for (var i = 0; i < items.length; i++) {
                _loop_2();
            }
            return Promise.all(promises);
        });
    };
    IndexedDBStorageAdapter.prototype.update = function (storeName) {
        var items = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            items[_i - 1] = arguments[_i];
        }
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readwrite"), store = transaction.objectStore(storeName);
            transaction.oncomplete = function () { };
            var promises = [];
            for (var i = 0; i < items.length; i++) {
                var request = store.put(items[i]), prom = new Promise(function (resolve, reject) {
                    request.onsuccess = function (event) {
                        resolve(event.target.result);
                    };
                    request.onerror = function (event) {
                        reject(event);
                    };
                });
                promises.push(prom);
            }
            return Promise.all(promises);
        });
    };
    IndexedDBStorageAdapter.prototype["delete"] = function (storeName) {
        var ids = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            ids[_i - 1] = arguments[_i];
        }
        return this.dbPromise.then(function (db) {
            var transaction = db.transaction(storeName, "readwrite"), store = transaction.objectStore(storeName);
            transaction.oncomplete = function () { };
            var promises = [];
            for (var i = 0; i < ids.length; i++) {
                var request = store["delete"](ids[i]), prom = new Promise(function (resolve, reject) {
                    request.onsuccess = function (event) {
                        resolve(event.target.result);
                    };
                    request.onerror = function (event) {
                        reject(event);
                    };
                });
                promises.push(prom);
            }
            return Promise.all(promises);
        });
    };
    return IndexedDBStorageAdapter;
}());
var StorageAdapter = (function () {
    function StorageAdapter(storage, key) {
        this.key = key;
        this.storage = storage;
        this.data = storage.getItem(key);
    }
    StorageAdapter.prototype.getAll = function () {
        var output = [];
        for (var id in this.data) {
            var item = this.data[id];
            output.push(item);
        }
        return output;
    };
    StorageAdapter.prototype.get = function (id) {
        return this.data[id];
    };
    StorageAdapter.prototype.add = function (item) {
        var keys = Object.keys(this.data);
        this.data[keys.length] = item;
        this.storage.setItem(this.key, this.data);
    };
    StorageAdapter.prototype.update = function (id, item) {
        if (id) {
            this.data[id] = item;
        }
        this.storage.setItem(this.key, this.data);
    };
    StorageAdapter.prototype["delete"] = function () {
        var ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ids[_i] = arguments[_i];
        }
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (id in this.data) {
                delete this.data[id];
            }
        }
        this.storage.setItem(this.key, this.data);
    };
    return StorageAdapter;
}());
var AsynchronousStorageAdapter = (function () {
    function AsynchronousStorageAdapter(storage, key) {
        this.key = key;
        this.storage = storage;
        this.data = storage.getItem(key) || {};
    }
    AsynchronousStorageAdapter.prototype.getAll = function (storeName) {
        var self = this;
        return Promise.resolve().then(function () {
            var output = [];
            for (var id in self.data) {
                var item = self.data[id];
                output.push(item);
            }
            return output;
        });
    };
    AsynchronousStorageAdapter.prototype.get = function (storeName, id) {
        var self = this;
        return Promise.resolve().then(function () {
            return self.data[id];
        });
    };
    AsynchronousStorageAdapter.prototype.add = function (storeName) {
        var items = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            items[_i - 1] = arguments[_i];
        }
        var self = this, keys = Object.keys(self.data), openKey = keys.length;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            while (openKey in self.data) {
                openKey++;
            }
            item.id = openKey;
            self.data[openKey] = item;
        }
        return Promise.resolve().then(function () {
            self.storage.setItem(self.key, self.data);
        });
    };
    AsynchronousStorageAdapter.prototype.update = function (storeName) {
        var items = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            items[_i - 1] = arguments[_i];
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i], id = item.id;
            this.data[id] = item;
        }
        var self = this;
        return Promise.resolve().then(function () {
            self.storage.setItem(self.key, self.data);
        });
    };
    AsynchronousStorageAdapter.prototype["delete"] = function (storeName) {
        var ids = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            ids[_i - 1] = arguments[_i];
        }
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (id in this.data) {
                delete this.data[id];
            }
        }
        var self = this;
        return Promise.resolve().then(function () {
            self.storage.setItem(self.key, self.data);
        });
    };
    return AsynchronousStorageAdapter;
}());
