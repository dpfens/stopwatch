const themes = {
  light: {
    variant: 'light'
  },
  dark: {
    variant: 'dark',
  },
},
ThemeContext = React.createContext(
  themes.light
);


var STOPWATCHSTORE = 'stopwatch',
    stopwatchAdapter,
    GROUPSTORE = 'group',
    groupAdapter;
if ('indexedDB' in window) {
  class StopwatchStorageAdapter extends IndexedDBStorageAdapter {

    upgrade(event) {
      let db = event.target.result;
      let groupStoreExists = db.objectStoreNames.contains(GROUPSTORE),
          stopwatchStoreExists = db.objectStoreNames.contains(STOPWATCHSTORE);
      if (!groupStoreExists) {
        let groupOptions = {
              keyPath: 'id',
              autoIncrement: true
        },
        groupStore = db.createObjectStore(GROUPSTORE, groupOptions);
      }

      if (!stopwatchStoreExists) {
        let stopwatchOptions = {
              keyPath: 'id',
              autoIncrement: true
        },
        stopwatchStore = db.createObjectStore(STOPWATCHSTORE, stopwatchOptions);
      }

    }
  }

  var databaseName = 'stopwatchv2',
      databaseVersion = 1;
  stopwatchAdapter = new StopwatchStorageAdapter(databaseName, databaseVersion);
}
