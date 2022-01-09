var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var themes = {
  light: {
    variant: 'light'
  },
  dark: {
    variant: 'dark'
  }
},
    ThemeContext = React.createContext(themes.light);

var STOPWATCHSTORE = 'stopwatch',
    stopwatchAdapter,
    GROUPSTORE = 'group',
    groupAdapter;
if ('indexedDB' in window) {
  var StopwatchStorageAdapter = function (_IndexedDBStorageAdap) {
    _inherits(StopwatchStorageAdapter, _IndexedDBStorageAdap);

    function StopwatchStorageAdapter() {
      _classCallCheck(this, StopwatchStorageAdapter);

      return _possibleConstructorReturn(this, (StopwatchStorageAdapter.__proto__ || Object.getPrototypeOf(StopwatchStorageAdapter)).apply(this, arguments));
    }

    _createClass(StopwatchStorageAdapter, [{
      key: 'upgrade',
      value: function upgrade(event) {
        var db = event.target.result;
        var groupStoreExists = db.objectStoreNames.contains(GROUPSTORE),
            stopwatchStoreExists = db.objectStoreNames.contains(STOPWATCHSTORE);
        if (!groupStoreExists) {
          var groupOptions = {
            keyPath: 'id',
            autoIncrement: true
          },
              groupStore = db.createObjectStore(GROUPSTORE, groupOptions);
        }

        if (!stopwatchStoreExists) {
          var stopwatchOptions = {
            keyPath: 'id',
            autoIncrement: true
          },
              stopwatchStore = db.createObjectStore(STOPWATCHSTORE, stopwatchOptions);
        }
      }
    }]);

    return StopwatchStorageAdapter;
  }(IndexedDBStorageAdapter);

  var databaseName = 'stopwatchv2',
      databaseVersion = 1;
  stopwatchAdapter = new StopwatchStorageAdapter(databaseName, databaseVersion);
}