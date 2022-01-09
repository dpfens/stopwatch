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
      let db = event.target.result,
          groupStore = GROUPSTORE,
          groupOptions = {
            keyPath: 'id',
            autoIncrement: true
      };
      db.createObjectStore(groupStore, groupOptions);

      let stopwatchStore = STOPWATCHSTORE,
          stopwatchOptions = {
            keyPath: 'id',
            autoIncrement: true
      };
      db.createObjectStore(stopwatchStore, stopwatchOptions);
    }
  }

  var databaseName = 'stopwatch',
      databaseVersion = 1;
  stopwatchAdapter = new StopwatchStorageAdapter(databaseName, databaseVersion);
}
